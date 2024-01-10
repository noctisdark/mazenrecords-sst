import { DynamoDBType, objectIsValid, recordIsValid } from "src/types";

import { Visit } from "./types";

export const mapVisitToDynamoDB = ({
  visit,
  userId,
}: {
  visit: Visit;
  userId: string;
}): DynamoDBType<Visit> => {
  if (!objectIsValid(visit)) {
    return {
      userId: { S: userId },
      sortKey: { S: `Visit#${visit.id}` },
      updatedAt: { N: visit.updatedAt.toString() },
      deleted: { BOOL: true },
    };
  }

  return {
    userId: { S: userId },
    sortKey: { S: `Visit#${visit.id}` },
    amount: { N: visit.amount.toString() },
    date: { N: visit.date.toString() },
    updatedAt: { N: visit.updatedAt.toString() },
    brand: { S: visit.brand },
    model: { S: visit.model },
    client: { S: visit.client },
    contact: { S: visit.contact },
    fix: { S: visit.fix },
    problem: { S: visit.problem },
  };
};

export const mapDynamoDBToVisit = (visit: DynamoDBType<Visit>): Visit => {
  if (!recordIsValid(visit)) {
    return {
      id: visit.sortKey.S.split("#")[1],
      updatedAt: +visit.updatedAt.N,
      deleted: true,
    };
  }

  return {
    id: visit.sortKey.S.split("#")[1],
    amount: +visit.amount.N,
    date: +visit.date.N,
    updatedAt: +visit.updatedAt.N,
    brand: visit.brand.S,
    model: visit.model.S,
    client: visit.client.S,
    contact: visit.contact.S,
    fix: visit.fix.S,
    problem: visit.problem.S,
  };
};

export const toJSON = (visit: DynamoDBType<Visit> | Visit): any => {
  if ("userId" in visit) {
    return toJSON(mapDynamoDBToVisit(visit));
  } else {
    return { ...visit, id: +visit.id };
  }
};
