import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const getJWTSubject = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string => event.requestContext.authorizer.jwt.claims.sub as string;
