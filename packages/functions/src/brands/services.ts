import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

import { dynamoDb } from "src/db";

import { Brand } from "./types";
import { DynamoDBType, ServiceError } from "src/types";
import { mapBrandToDynamoDB, mapDynamoDBToBrand } from "./serializers";

export const getById = async ({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}): Promise<Brand> => {
  const get = await dynamoDb.getItem({
    TableName: process.env.TABLE_NAME!,
    Key: {
      userId: { S: userId },
      sortKey: { S: `Brand#${brandId}` },
    },
  });

  if (!get.Item)
    throw new ServiceError({
      reason: "not_found",
      message: `Brand with id: ${brandId} doesn't exist`,
    });

  return mapDynamoDBToBrand(get.Item as DynamoDBType<Brand>);
};

export const addOrUpdate = async ({
  method,
  userId,
  brand,
}: {
  method: "add" | "update";
  userId: string;
  brand: any;
}): Promise<Brand> => {
  if (!brand.id) throw `Invalid brand id: ${brand.id}`;
  brand = {
    ...brand,
    updatedAt: +new Date(),
  };

  const item = mapBrandToDynamoDB({
    brand,
    userId,
  });

  try {
    await dynamoDb.putItem({
      TableName: process.env.TABLE_NAME!,
      Item: item,
      ConditionExpression:
        method === "add"
          ? "(attribute_not_exists(userId) AND attribute_not_exists(sortKey)) OR attribute_exists(deleted)"
          : undefined,
    });
    return brand;
  } catch (error) {
    // return custom errors
    if (error instanceof ConditionalCheckFailedException)
      throw new ServiceError({
        reason: "already_exists",
        message: `Brand with id: ${brand.id} already exists`,
        action: "update",
      });
    else throw error; // Unexpected error
  }
};

export const deleteById = async ({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}): Promise<number> => {
  const deleteTime = +new Date();
  const item = mapBrandToDynamoDB({
    brand: {
      id: brandId,
      updatedAt: +new Date(),
      deleted: true,
    },
    userId,
  });

  try {
    await dynamoDb.putItem({
      TableName: process.env.TABLE_NAME!,
      Item: item,
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(sortKey) AND attribute_not_exists(deleted)",
    });
    return deleteTime;
  } catch (error) {
    // return custom errors
    if (error instanceof ConditionalCheckFailedException)
      throw new ServiceError({
        reason: "not_found",
        message: `Brand with id: ${brandId} doesn't exist`,
        action: "update",
      });
    else throw error; // Unexpected error
  }
};
