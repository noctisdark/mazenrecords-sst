import {
  DynamoDB
} from "@aws-sdk/client-dynamodb";

export const dynamoDb = new DynamoDB({
  region: process.env.REGION,
});