import { makeAxiosRequest } from "@kss-backend/core/mainframe/helpers/test/intHelpers";
import { IAxiosResponse } from "@kss-backend/core/mainframe/helpers/test/types";
import { describe, it, expect } from "vitest";
import axios from "axios";

const publicBaseUrl = "https://b1pp8r0chj.execute-api.eu-central-1.amazonaws.com";

const fakeCompanyId = "000000000000000000000000";
const fakeRestaurantId = "000000000000000000000000";

const realCompanyId = "689a23c4585b744bab4792b8";
const realRestaurantId = "68a48534d8976c3c16abf76a";

describe("Public API - getRestaurant", () => {
  it.skip("should return 404 if restaurant is not found", async () => {
    try {
      await makeAxiosRequest<undefined, IAxiosResponse<any>>({
        url: `${publicBaseUrl}/company/${fakeCompanyId}/restaurant/${fakeRestaurantId}`,
        method: "GET",
      });
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            const status: number = error.response.status;
            const data = error.response.data as any;

            // Assert
            expect(status).toBe(404);
            expect(data).toMatchObject({
                error: {
                message: "Restaurant not found",
                },
            });
        }
    }
  });

  it(
    "should return restaurant data for valid companyId and restaurantId",
    async () => {
        const validCompanyId = realCompanyId;
        const validRestaurantId = realRestaurantId;
        const response = await makeAxiosRequest<undefined, IAxiosResponse<any>>({
            url: `${publicBaseUrl}/company/${validCompanyId}/restaurant/${validRestaurantId}`,
            method: "GET",
        });
        expect(response.data.statusCode).toBe(200);
        expect(response.data.payload.success).toBe(true);
        expect(response.data.payload.data).toHaveProperty("_id", validRestaurantId);
    }, 10000);
});
