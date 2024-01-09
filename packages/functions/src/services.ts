import {
  AttributeValue,
  QueryCommandOutput,
  TransactWriteItem,
} from "@aws-sdk/client-dynamodb";

import { dynamoDb } from "src/db";

import { DynamoDBType, objectIsValid, recordIsValid } from "./types";
import { Visit } from "./visits/types";
import { mapVisitToDynamoDB } from "./visits/serializers";
import { Brand } from "./brands/types";
import { mapBrandToDynamoDB } from "./brands/serializers";

// evil function
export const getAll = async <T extends { id: string }>({
  AdditionalKeyConditionExpression = "",
  AdditionalExpressionAttributeValues = {},
  ProjectionExpression,
  userId,
  IndexName,
}: {
  IndexName?: string;
  AdditionalKeyConditionExpression?: string;
  AdditionalExpressionAttributeValues?: Record<string, AttributeValue>;
  ProjectionExpression?: string;
  userId: string;
}): Promise<Partial<DynamoDBType<T>>[]> => {
  let KeyConditionExpression = `userId = :userId${
    AdditionalKeyConditionExpression
      ? ` AND ${AdditionalKeyConditionExpression}`
      : ""
  }`;

  let ExpressionAttributeValues: Record<string, AttributeValue> = {
    ":userId": {
      S: userId,
    },
    ...AdditionalExpressionAttributeValues,
  };

  let ExclusiveStartKey;
  let result: DynamoDBType<T>[] = [];
  let query: QueryCommandOutput;

  do {
    query = await dynamoDb.query({
      TableName: process.env.TABLE_NAME!,
      KeyConditionExpression,
      ExpressionAttributeValues,
      ExclusiveStartKey,
      ProjectionExpression,
      IndexName,
    });

    result = [...result, ...(query.Items as DynamoDBType<T>[])];
    ExclusiveStartKey = query.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return result;
};

// isn't actually a transaction, fix later
export const transactWrite = async <T>(
  array: T[],
  mapItemToWriteItem: (item: T, index: number) => TransactWriteItem
) => {
  let length = array.length;
  let index = 0;

  while (index < length) {
    const nextSplit = index + Math.min(array.length - index, 25);
    const updates: TransactWriteItem[] = [];

    for (; index < nextSplit; index++)
      updates.push(mapItemToWriteItem(array[index], index));

    // maybe with retry
    await dynamoDb.transactWriteItems({ TransactItems: updates });
  }
};

export const deleteAll = async ({
  userId,
}: {
  userId: string;
}): Promise<number> => {
  const deleteTime = +new Date();
  const itemSortKeys = (
    await getAll({
      userId,
      ProjectionExpression: "deleted, sortKey",
    })
  )
    .filter((item) => !("deleted" in item))
    .map((item) => item.sortKey!.S);

  await transactWrite(itemSortKeys, (sortKey) => ({
    Put: {
      TableName: process.env.TABLE_NAME!,
      Item: {
        userId: { S: userId },
        sortKey: { S: sortKey },
        deleted: { BOOL: true },
        updatedAt: { N: deleteTime.toString() },
      },
    },
  }));

  return deleteTime;
};

export const replaceAll = async ({
  userId,
  visits,
  brands,
}: {
  userId: string;
  visits: Visit[];
  brands: Brand[];
}) => {
  // delete all existing records
  const updatedAt = +new Date();

  await deleteAll({ userId });

  await transactWrite<Visit>(visits, (visit) => ({
    Put: {
      TableName: process.env.TABLE_NAME!,
      Item: mapVisitToDynamoDB({
        visit: { ...visit, updatedAt },
        userId,
      }),
    },
  }));

  await transactWrite<Brand>(brands, (brand) => ({
    Put: {
      TableName: process.env.TABLE_NAME!,
      Item: mapBrandToDynamoDB({
        brand: { ...brand, updatedAt },
        userId,
      }),
    },
  }));

  return updatedAt;
};
