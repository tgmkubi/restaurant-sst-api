import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRestaurantHandler } from "../../src/Global-Public-Api/functions/restaurant/get-restaurant";

const mockTenantModels = {
  Restaurant: {
    findOne: vi.fn()
  }
};

function mockEvent({ id = '', companyId = '' } = {}) {
  return {
    pathParameters: { id, companyId },
    tenantModels: mockTenantModels,
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    requestContext: {
      accountId: '',
      apiId: '',
      authorizer: {},
      protocol: '',
      httpMethod: 'GET',
      identity: {
        accessKey: '',
        accountId: '',
        apiKey: '',
        apiKeyId: '',
        caller: '',
        clientCert: null,
        cognitoAuthenticationProvider: '',
        cognitoAuthenticationType: '',
        cognitoIdentityId: '',
        cognitoIdentityPoolId: '',
        principalOrgId: '',
        sourceIp: '',
        user: '',
        userAgent: '',
        userArn: '',
      },
      path: '',
      stage: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
    },
    resource: '',
    stageVariables: {},
    globalModels: undefined,
    path: '',
  };
}
// Remove duplicate and misplaced 'event' declarations.
// You should declare 'event' only once per test case, inside the relevant test block.
// Example usage inside a test block:

describe('getRestaurantHandler', () => {
  it('should throw BadRequest if Restaurant ID and Company ID are missing', async () => {
    const event = mockEvent({ id: '', companyId: '' });
    await expect(getRestaurantHandler(event)).rejects.toThrow('Restaurant ID and Company ID are required');
  });

  it('should process valid Restaurant ID and Company ID', async () => {
    const event = mockEvent({ id: 'rest1', companyId: 'company1' });
    // Add your test logic here for valid IDs
  });
});
