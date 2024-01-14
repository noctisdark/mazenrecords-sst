# Mazen Records SST

## Overview
Mazen Records SST is a Serverless Stack (SST) project that provides a full-stack solution for managing TV repair visits. This project leverages AWS services, including Cognito for JWT authentication, DynamoDB for storage, and Lambda for serverless execution. Additionally, it includes a frontend build of the Mazen Records' frontend repository, delivered via CloudFront.

## What is SST (Serverless Stack)?
Serverless Stack (SST) is an open-source framework for building serverless applications. It simplifies the process of defining and deploying serverless infrastructure on AWS using infrastructure-as-code principles.

## Features

### Authentication with Cognito
- Utilizes AWS Cognito for secure and scalable user authentication.
- Enables the use of JWT (JSON Web Tokens) for authentication and authorization.

### Data Storage with DynamoDB
- Leverages AWS DynamoDB for a serverless, highly available, and scalable NoSQL database solution.

### Serverless Execution with Lambda
- Implements serverless functions using AWS Lambda for efficient and cost-effective execution of backend logic.

### Frontend Delivery via CloudFront
- Deploys the Mazen Records' frontend build through AWS CloudFront for fast and secure content delivery.

## Installation
1. Clone the repository:
  ```bash
   git clone git@github.com:noctisdark/mazenrecords-sst.git
  ```

2. Navigate to the project directory:
  ```bash
  cd mazenrecords-sst
  ```

3. Initialize and update the frontend submodule
  ```bash
  git submodule init && git submodule update
  ```

3. Install dependencies:
  ```bash
  pnpm install
  ```
4. Connect to AWS CLI (Single Sign-On):
  ```bash
  aws sso login --sso-session=your_login
  ```

5. Deploy the SST stack in development mode:
  ```bash
  pnpm sst dev
  ```

6. Deploy the SST stack to a specific stage:
  ```bash
  pnpm sst deploy --stage your_stage
  ```

## Usage
Access the deployed frontend through the CloudFront URL provided after deployment.

Interact with the TV repair visit management system, including user authentication, data storage, and serverless execution.

| **Visits Table** | **Add a Visit** | **Checkout a Visit** | **Autocomplete Brands** |
|-------------------------|-------------------------|-------------------------|-------------------------|
![overview](https://github.com/noctisdark/mazenrecords-front/assets/88320615/b9f449cf-c512-443d-88dc-2cc1b7dd494b) | ![Visits](https://github.com/noctisdark/mazenrecords-front/assets/88320615/6a98b68e-3800-430b-bc61-166ff7db42f4) | ![checkout](https://github.com/noctisdark/mazenrecords-front/assets/88320615/d9d029da-fd48-4df6-817d-dd3e562af26d) | ![image](https://github.com/noctisdark/mazenrecords-front/assets/88320615/3fa4099c-d6bf-45ad-9162-9568094110f5)

### Updating Records
This application uses a specific data structure for record updates:

```typescript
export type Visit = Deletable<{
  id: string;
  date: number;
  client: string;
  contact: string;
  brand: string;
  model: string;
  problem: string;
  fix: string;
  amount: number;
  updatedAt: number;
}>;

export type Deletable<T extends { id: string }> =
  | T
  | { id: string; deleted: true; updatedAt: number };
```
If a record is marked as deleted ({ deleted: true }), the frontend removes it from its IndexedDB. Otherwise, the record is inserted or updated based on the updatedAt timestamp, facilitating synchronization between the client (potentially offline) and the server.

## License
This project is licensed under the MIT License.
