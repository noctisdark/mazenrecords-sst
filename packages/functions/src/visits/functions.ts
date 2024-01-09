import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

import { ServiceError } from "src/types";

import {
  getById as getVisitById,
  addOrUpdate as addOrUpdateVisit,
  deleteById as deleteVisitById,
} from "./services";
import { toJSON } from "./serializers";

const getJWTSubject = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string => event.requestContext.authorizer.jwt.claims.sub as string;

// GET /visits/{id}
export const getById = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const userId = getJWTSubject(event);
  const visitId = event.pathParameters?.id;

  if (!visitId || Number.isNaN(+visitId))
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid visit id: ${visitId}.` }),
    };

  try {
    const visit = await getVisitById({ userId, visitId });
    return {
      statusCode: 200,
      body: JSON.stringify({
        visit: toJSON(visit),
      }),
    };
  } catch (error) {
    if (error instanceof ServiceError && error.reason === "not_found") {
      return {
        statusCode: 404,
        body: JSON.stringify(error),
      };
    }

    // forward
    throw error;
  }
};

//PATCH /visits
//POST /visits
// TODO: handle list
export const addOrUpdate = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const method = event.requestContext.http.method;
  const userId = getJWTSubject(event);
  let visit;

  try {
    const body = JSON.parse(event.body!);
    visit = body.visit;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid body` }),
    };
  }

  try {
    const updatedVisit = await addOrUpdateVisit({
      method: method === "POST" ? "add" : "update",
      visit,
      userId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        visit: updatedVisit,
      }),
    };
  } catch (error) {
    if (error instanceof ServiceError && error.reason === "already_exists")
      return {
        status: 400,
        body: JSON.stringify(error),
      };

    // forward
    throw error;
  }
};

export const deleteById = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const userId = getJWTSubject(event);
  const visitId = event.pathParameters?.id;

  if (!visitId)
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid visit id: ${visitId}.` }),
    };

  try {
    const timestamp = await deleteVisitById({
      userId,
      visitId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ timestamp }),
    };
  } catch (error) {
    if (error instanceof ServiceError && error.reason === "not_found")
      return {
        statusCode: 404,
        body: JSON.stringify(error),
      };
    //forward
    throw error;
  }
};
