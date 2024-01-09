import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

import { getJWTSubject } from "src/utils";
import { Brand } from "src/brands/types";
import { Visit } from "src/visits/types";
import { DynamoDBType } from "src/types";
import {
  mapVisitToDynamoDB,
  toJSON as visitToJSON,
} from "src/visits/serializers";
import {
  toJSON as brandToJSON,
  mapBrandToDynamoDB,
} from "src/brands/serializers";
import { deleteAll, getAll, transactWrite } from "src/services";

//GET /updates
export const updatesSince = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const userId = getJWTSubject(event);
  const epoch = event.queryStringParameters?.epoch!;

  if (!epoch)
    return {
      statusCode: 400,
      body: `search parameters epoch expected`,
    };

  // shouldn't fail
  const results = await getAll<Brand | Visit>({
    userId,
    AdditionalKeyConditionExpression: "updatedAt > :epoch",
    AdditionalExpressionAttributeValues: {
      ":epoch": {
        N: epoch,
      },
    },
    IndexName: "updates_lsi",
  });

  const visitsRecords = (results?.filter((item) =>
    item.sortKey!.S.startsWith("Visit")
  ) ?? []) as DynamoDBType<Visit>[];

  const brandsRecords = (results?.filter((item) =>
    item.sortKey!.S.startsWith("Brand")
  ) ?? []) as DynamoDBType<Brand>[];

  const visits = visitsRecords.map((visit: DynamoDBType<Visit>) =>
    visitToJSON(visit)
  );
  const brands = brandsRecords.map((brand: DynamoDBType<Brand>) =>
    brandToJSON(brand)
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      visits,
      brands,
    }),
  };
};

//PATCH /upload
export const upload = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  const userId = getJWTSubject(event);
  let visits, brands;

  try {
    const body = JSON.parse(event.body!);
    visits = body.visits;
    brands = body.brands;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid body` }),
    };
  }

  const timestamp = +new Date();
  // delete all existing records
  await deleteAll({ userId });
  const newVisits: Visit[] = [],
    newBrands: Brand[] = [];

  await transactWrite<Visit>(visits, (visit) => {
    newVisits.push(visitToJSON({ ...visit, updatedAt: timestamp }));

    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapVisitToDynamoDB({
          visit: { ...visit, updatedAt: timestamp },
          userId,
        }),
      },
    };
  });

  await transactWrite<Brand>(brands, (brand) => {
    newBrands.push(brandToJSON({ ...brand, updatedAt: timestamp }));

    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapBrandToDynamoDB({
          brand: { ...brand, updatedAt: timestamp },
          userId,
        }),
      },
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      visits: newVisits,
      brands: newBrands,
      timestamp,
    }),
  };
};

//PATCH /sync
export const sync = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = getJWTSubject(event);
  let visitDeletes;
  let brandDeletes;
  let visitUpserts;
  let brandUpserts;

  try {
    const body = JSON.parse(event.body!);
    visitDeletes = body.visitDeletes;
    brandDeletes = body.brandDeletes;
    visitUpserts = body.visitUpserts;
    brandUpserts = body.brandUpserts;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid body` }),
    };
  }

  const timestamp = +new Date();

  await transactWrite<string>(visitDeletes, (deleteId) => {
    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapVisitToDynamoDB({
          userId,
          visit: {
            deleted: true,
            id: deleteId,
            updatedAt: timestamp,
          },
        }),
      },
    };
  });

  await transactWrite<string>(brandDeletes, (deleteId) => {
    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapBrandToDynamoDB({
          userId,
          brand: {
            deleted: true,
            id: deleteId,
            updatedAt: timestamp,
          },
        }),
      },
    };
  });

  // delete all existing records
  const newVisits: Visit[] = [],
    newBrands: Brand[] = [];

  await transactWrite<Visit>(visitUpserts, (visit) => {
    newVisits.push(visitToJSON({ ...visit, updatedAt: timestamp }));

    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapVisitToDynamoDB({
          visit: { ...visit, updatedAt: timestamp },
          userId,
        }),
      },
    };
  });

  await transactWrite<Brand>(brandUpserts, (brand) => {
    newBrands.push(brandToJSON({ ...brand, updatedAt: timestamp }));

    return {
      Put: {
        TableName: process.env.TABLE_NAME!,
        Item: mapBrandToDynamoDB({
          brand: { ...brand, updatedAt: timestamp },
          userId,
        }),
      },
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      visits: newVisits,
      brands: newBrands,
      timestamp,
    }),
  };
};
