
# SST V2 - MongoDB Boilerplate

## Overview
This project is a multi-tenant backend boilerplate built with SST (Serverless Stack), AWS, and MongoDB. It provides a scalable foundation for SaaS platforms, supporting tenant isolation, secure authentication, and flexible API development.

### Key Features
- **Multi-Tenant Architecture:** Each company/tenant has isolated data in its own MongoDB database.
- **AWS Infrastructure:** Uses AWS services (Lambda, Cognito, DynamoDB, S3, Secrets Manager) for serverless deployment and scalability.
- **SST Framework:** Simplifies infrastructure-as-code and deployment.
- **Secure Authentication:** Global and company-level user pools via AWS Cognito.
- **API Gateway:** RESTful endpoints for public and protected APIs.
- **Configurable Secrets:** MongoDB connection URI managed securely via AWS Secrets Manager.

## Prerequisites
- Node.js >= 18.x
- Yarn (recommended)
- AWS CLI configured with credentials (`aws configure`)
- SST CLI installed globally (`npm install -g sst`)

## Setup Instructions

### 1. AWS Credentials
Before running the project, ensure your AWS credentials are set up:
```bash
aws configure
```
This will prompt you for your AWS Access Key ID, Secret Access Key, region, and output format.

### 2. Install Dependencies
```bash
yarn
```

### 3. Deploy Initial Infrastructure
Run the following command to deploy the initial stack and create required AWS resources:
```bash
yarn dev:local
```
This will deploy the `ConfigStack`, which includes:
- S3 bucket for media assets
- DynamoDB main table
- Cognito user pool
- AWS Secrets Manager secret for MongoDB (created empty)

### 4. Set MongoDB Connection URI
After the first deployment, an empty secret for MongoDB is created in AWS Secrets Manager. You must manually set the correct MongoDB connection URI:
1. Go to the [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/).
2. Find the secret named `<stage>-mongodb-secret` (e.g., `dev-mongodb-secret`).
3. Edit the secret and set the `connectionUri` field to your MongoDB connection string.

### 5. Environment Variables
Set required environment variables in your shell profile (`.zshrc`, `.bashrc`, etc.):
- `MAIN_TABLE_NAME`
- `GLOBAL_COGNITO_USER_POOL_NAME`
- `DOMAIN` (if using custom domains)
- `HOSTED_ZONE_ID` (if using custom domains)

Example:
```bash
export MAIN_TABLE_NAME=MainTable
export GLOBAL_COGNITO_USER_POOL_NAME=GlobalUserPool
```

### 6. Multi-Tenant Usage
- Each tenant/company is identified by a unique `companyId`.
- Data isolation is achieved by connecting to `COMPANY_{companyId}` MongoDB databases.
- API endpoints require the correct `companyId` in path parameters for tenant-specific operations.

## Usage
- Develop and test locally with `yarn dev:local`.
- Deploy to AWS using SST commands (`sst deploy`).
- Update secrets and environment variables as needed for each environment (dev, prod, etc.).
- Use Cognito for authentication and user management.
- Access tenant data via API endpoints, passing the correct `companyId`.

## Important Notes
- The project will not connect to MongoDB until you set the `connectionUri` in AWS Secrets Manager after the first deployment.
- All infrastructure is managed via SST and AWS CDK; do not manually create resources unless instructed.
- For custom domains, uncomment and configure the relevant section in `ConfigStack.ts`.

## Troubleshooting
- If you see errors related to missing secrets or database connections, verify the `connectionUri` is set correctly in AWS Secrets Manager.
- Ensure all required environment variables are exported in your shell.
- Check AWS IAM permissions for your credentials.

## Resources
- [SST Documentation](https://v2.sst.dev)
- [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/)
- [AWS Cognito](https://console.aws.amazon.com/cognito/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)

---

For further questions or issues, please open an issue or contact the maintainer.