import { AttributeValue } from "@aws-sdk/client-dynamodb";

type Field<Object> = keyof Object;
type FieldType<Object, K extends Field<Object>> = Object[K];

type DynamoDBFieldType<T> = T extends number
  ? AttributeValue.NMember
  : T extends string
  ? AttributeValue.SMember
  : T extends true
  ? { BOOL: true }
  : T extends false
  ? { BOOL: false }
  : T extends any[]
  ? AttributeValue.LMember
  : T extends Set<string>
  ? AttributeValue.SSMember
  : AttributeValue.$UnknownMember; //NULLMember;

export type MapToDynamoDBType<T> = {
  [K in keyof T]: DynamoDBFieldType<FieldType<T, K>>;
};

export type Deletable<T extends { id: string }> =
  | T
  | { id: string; deleted: true; updatedAt: number };

type UnionOmit<T, K extends keyof any> = T extends T
  ? Pick<T, Exclude<keyof T, K>>
  : never;

export type DynamoDBType<T extends { id: string }> = MapToDynamoDBType<{
  userId: string;
  sortKey: string;
}> &
  MapToDynamoDBType<UnionOmit<T, "id">>;

export function objectIsValid<T extends { id: string }>(
  t: Deletable<T>
): t is T {
  return !("deleted" in t);
}

export function recordIsValid<T extends { id: string }>(
  t: DynamoDBType<Deletable<T>>
): t is DynamoDBType<T> {
  return !("deleted" in t);
}

export class ServiceError {
  public message: string;
  public action?: string;
  public reason?: string;

  constructor({
    message,
    reason,
    action,
  }: {
    message: string;
    reason?: string;
    action?: string;
  }) {
    this.message = message;
    this.action = action;
    this.reason = reason;
  }
}
