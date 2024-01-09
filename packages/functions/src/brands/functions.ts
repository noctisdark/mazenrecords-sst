import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

import { ServiceError } from "src/types";

import {
  getById as getBrandById,
  addOrUpdate as addOrUpdateBrand,
  deleteById as deleteBrandById,
} from "./services";
import { toJSON } from "./serializers";

const getJWTSubject = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string => event.requestContext.authorizer.jwt.claims.sub as string;

// GET /brands/{id}
export const getById = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const userId = getJWTSubject(event);
  const brandId = event.pathParameters?.id;

  if (!brandId)
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid brand id: ${brandId}.` }),
    };

  try {
    const brand = await getBrandById({ userId, brandId });
    return {
      statusCode: 200,
      body: JSON.stringify({
        brand: toJSON(brand),
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

//PATCH /brands
//POST /brands
// TODO: handle list
export const addOrUpdate = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const method = event.requestContext.http.method;
  const userId = getJWTSubject(event);
  let brand;

  try {
    const body = JSON.parse(event.body!);
    brand = body.brand;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid body` }),
    };
  }

  try {
    const updatedbrand = await addOrUpdateBrand({
      method: method === "POST" ? "add" : "update",
      brand,
      userId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        brand: updatedbrand,
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
  const brandId = event.pathParameters?.id;

  if (!brandId)
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid brand id: ${brandId}.` }),
    };

  try {
    const timestamp = await deleteBrandById({
      userId,
      brandId,
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
