import { DynamoDBType, objectIsValid, recordIsValid } from "src/types";

import { Brand } from "./types";

export const mapBrandToDynamoDB = ({
  brand,
  userId,
}: {
  brand: Brand;
  userId: string;
}): DynamoDBType<Brand> => {
  if (!objectIsValid(brand)) {
    return {
      userId: { S: userId },
      sortKey: { S: `Brand#${brand.id}` },
      updatedAt: { N: brand.updatedAt.toString()},
      deleted: { BOOL: true },
    };
  }

  return {
    userId: { S: userId },
    sortKey: { S: `Brand#${brand.id}` },
    name: { S: brand.name },
    models: { SS: [...brand.models] },
    updatedAt: { N: brand.updatedAt.toString() },
  };
};

// for logical operations
export const mapDynamoDBToBrand = (brand: DynamoDBType<Brand>): Brand => {
  if (!recordIsValid(brand)) {
    return {
      id: brand.sortKey.S.split("#")[1],
      updatedAt: +brand.updatedAt.N,
      deleted: true,
    };
  }

  return {
    id: brand.sortKey.S.split("#")[1],
    name: brand.name.S,
    models: new Set(brand.models.SS as string[]),
    updatedAt: +brand.updatedAt.N,
  };
};

export const toJSON = (brand: DynamoDBType<Brand> | Brand): any => {
  if ("userId" in brand) {
    return toJSON(mapDynamoDBToBrand(brand));
  } else {
    return objectIsValid(brand)
      ? {
          ...brand,
          models: [...brand.models],
        }
      : brand;
  }
};
