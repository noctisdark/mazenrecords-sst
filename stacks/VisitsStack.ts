import { Api, Cognito, Table, StackContext, StaticSite } from "sst/constructs";

import { AccountRecovery, Mfa } from "aws-cdk-lib/aws-cognito";

/**
 * Data types for attributes within a table
 *
 * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes
 */
declare module "aws-cdk-lib/aws-dynamodb" {
  export enum AttributeType {
    /**
     * List types
     */
    LIST = "L",
    BOOL = "BOOL",
  }
}

export function VisitsStack({ stack, app }: StackContext) {
  const auth = new Cognito(stack, "visits-auth", {
    login: ["email"],
    cdk: {
      userPool: {
        selfSignUpEnabled: false,
        mfa: Mfa.OPTIONAL,
        mfaSecondFactor: { sms: false, otp: true },
        accountRecovery: AccountRecovery.EMAIL_ONLY,
      },
    },
  });

  // client
  const authClient = auth.cdk.userPool.addClient("cognito-visits-client", {
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
      },
      callbackUrls: [
        //* Replace by the actual generated site url in aws console
        // "http://localhost:3000/callback",
        "mazensapp://localhost/callback",
      ],
      logoutUrls: [
        // "http://localhost:3000/logout",
        "mazensapp://localhost/logout",
      ],
    },
  });

  // domain for hosted ui
  const authDomain = auth.cdk.userPool.addDomain("cognito-visits-domain", {
    cognitoDomain: {
      domainPrefix: "auth",
    },
  });

  // Create Dynamo DB Tables
  // Use soft delete pattern to make object as deleted -> useful for updates
  //https://sst.dev/examples/how-to-create-a-crud-api-with-serverless-using-dynamodb.html
  // TODO: Connect to lambda
  const RecordsTable = new Table(stack, "RecordsTable", {
    fields: {
      userId: "string", // uuid from JWT
      sortKey: "string", // use format Visit#{id} or Brand#{id}
      updatedAt: "number", // updated at
    },
    primaryIndex: { partitionKey: "userId", sortKey: "sortKey" },
    localIndexes: {
      updates_lsi: {
        sortKey: "updatedAt",
      },
    },
  });

  // Create Api
  const api = new Api(stack, "visits-api", {
    authorizers: {
      jwt: {
        type: "user_pool",
        userPool: {
          id: auth.userPoolId,
          clientIds: [authClient.userPoolClientId],
        },
      },
    },
    defaults: {
      authorizer: "jwt",
      function: {
        bind: [RecordsTable],
        environment: {
          REGION: process.env.REGION!,
          TABLE_NAME: RecordsTable.tableName,
        },
      },
    },
    routes: {
      // visits
      "GET /visits/{id}": "packages/functions/src/visits/functions.getById",
      "DELETE /visits/{id}":
        "packages/functions/src/visits/functions.deleteById",
      "POST /visits": "packages/functions/src/visits/functions.addOrUpdate",
      "PATCH /visits": "packages/functions/src/visits/functions.addOrUpdate",

      // brands
      "GET /brands/{id}": "packages/functions/src/brands/functions.getById",
      "DELETE /brands/{id}":
        "packages/functions/src/brands/functions.deleteById",
      "POST /brands": "packages/functions/src/brands/functions.addOrUpdate",
      "PATCH /brands": "packages/functions/src/brands/functions.addOrUpdate",

      // updates
      "GET /updatesSince":
        "packages/functions/src/updates/functions.updatesSince",
      "PATCH /upload": "packages/functions/src/updates/functions.upload",
      "PATCH /sync": "packages/functions/src/updates/functions.sync",
    },
  });

  // allowing authenticated users to access API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  const site = new StaticSite(stack, "frontend", {
    path: "packages/website",
    buildOutput: "dist",
    buildCommand: "bun vite build",
    environment: {
      VITE_ANDROID_SCHEME: "mazensapp",
      VITE_ANDROID_HOST: "localhost",
      VITE_DEV_AUTH_SERVER_URL: authDomain.baseUrl(),
      VITE_DEV_CLIENT_ID: authClient.userPoolClientId,
      VITE_DEV_API_ENDPOINT: api.url
    },
  });

  
  stack.addOutputs({
    ApiEndpoint: api.url,
    UserPoolId: auth.userPoolId,
    UserPoolClientId: authClient.userPoolClientId,
    CognitoBaseUrl: authDomain.baseUrl(),
    SiteUrl: site.url,
  });




}

// Use soft delete pattern, on delete set a property to true
// On the frontend, make sure these items are deleted
