import {
  ConditionalCheckFailedException,
  TransactWriteItem,
} from "@aws-sdk/client-dynamodb";

import { dynamoDb } from "src/db";

import { Visit } from "./types";
import { DynamoDBType, ServiceError } from "src/types";
import { mapVisitToDynamoDB, mapDynamoDBToVisit } from "./serializers";

export const getById = async ({
  userId,
  visitId,
}: {
  userId: string;
  visitId: string;
}): Promise<Visit> => {
  const get = await dynamoDb.getItem({
    TableName: process.env.TABLE_NAME!,
    Key: {
      userId: { S: userId },
      sortKey: { S: `Visit#${visitId}` },
    },
  });

  if (!get.Item)
    throw new ServiceError({
      reason: "not_found",
      message: `Visit with id: ${visitId} doesn't exist`,
    });

  return mapDynamoDBToVisit(get.Item as DynamoDBType<Visit>);
};

export const addOrUpdate = async ({
  method,
  userId,
  visit,
}: {
  method: "add" | "update";
  userId: string;
  visit: any;
}): Promise<Visit> => {
  if (!visit.id) throw `Invalid visit id: ${visit.id}`;
  visit = {
    ...visit,
    updatedAt: +new Date(),
  };

  const item = mapVisitToDynamoDB({
    visit,
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
    return visit;
  } catch (error) {
    // return custom errors
    if (error instanceof ConditionalCheckFailedException)
      throw new ServiceError({
        reason: "already_exists",
        message: `Visit with id: ${visit.id} already exists`,
        action: "update",
      });
    else throw error; // Unexpected error
  }
};

export const deleteById = async ({
  userId,
  visitId,
}: {
  userId: string;
  visitId: string;
}): Promise<number> => {
  const deleteTime = +new Date();
  const item = mapVisitToDynamoDB({
    visit: {
      id: visitId,
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
        message: `Visit with id: ${visitId} doesn't exist`,
        action: "update",
      });
    else throw error; // Unexpected error
  }
};
