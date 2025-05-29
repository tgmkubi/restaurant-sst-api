import { CloudWatchClient, GetMetricStatisticsCommand, GetMetricStatisticsInput } from "@aws-sdk/client-cloudwatch";
import {
    CloudWatchLogsClient,
    GetQueryResultsCommand,
    GetQueryResultsCommandOutput,
    StartQueryCommand,
    StartQueryCommandInput,
    StartQueryCommandOutput,
} from "@aws-sdk/client-cloudwatch-logs";
import { sleep } from "../utils";

const cwClient = new CloudWatchClient({ region: process.env.SERVICE_REGION });
const cwLogsClient = new CloudWatchLogsClient({ region: process.env.SERVICE_REGION });

export const getMetricStatistics = async (params: GetMetricStatisticsInput) => {
    const { Namespace, MetricName, StartTime, EndTime, Period, Statistics, Dimensions } = params;

    return cwClient.send(
        new GetMetricStatisticsCommand({
            Namespace: Namespace,
            MetricName: MetricName,
            StartTime: StartTime,
            EndTime: EndTime,
            Period: Period,
            Statistics: Statistics,
            Dimensions: Dimensions,
        }),
    );
};

export const startQuery = async (
    params: StartQueryCommandInput,
): Promise<{ queryResponse: StartQueryCommandOutput; results: GetQueryResultsCommandOutput["results"] }> => {
    const startQueryCommand = new StartQueryCommand(params);

    try {
        // Start the query and get the queryId
        const startQueryResponse: StartQueryCommandOutput = await cwLogsClient.send(startQueryCommand);
        const queryId = startQueryResponse.queryId;

        if (!queryId) {
            throw new Error("Query ID not found. Failed to start the query.");
        }

        // Poll for query results until it completes
        const getQueryResultsResponse = await cwLogsClient.send(new GetQueryResultsCommand({ queryId }));
        let queryStatus = getQueryResultsResponse.status!;
        let queryResults = getQueryResultsResponse.results! || [];

        while (queryStatus === "Running" || queryStatus === "Scheduled") {
            await sleep(1000);

            // Fetch the current status and results of the query
            const getQueryResultsCommand = new GetQueryResultsCommand({ queryId });
            const getQueryResultsResponse = await cwLogsClient.send(getQueryResultsCommand);

            queryStatus = getQueryResultsResponse.status!;
            if (getQueryResultsResponse.results) {
                queryResults = queryResults.concat(getQueryResultsResponse.results);
            }
        }

        // Remove duplicates based on @ptr
        if (queryResults) {
            const seenPtrs = new Set<string>();
            queryResults = queryResults.filter((result) => {
                const ptrField = result.find(field => field.field === "@ptr");
                if (ptrField) {
                    const ptrValue = ptrField.value!;
                    if (seenPtrs.has(ptrValue)) {
                        return false; // Duplicate, exclude it
                    } else {
                        seenPtrs.add(ptrValue);
                        return true; // New, include it
                    }
                }
                return true; // Include if no @ptr field (unlikely case)
            });
        }

        // Return the original start query response and final results once complete
        if (queryStatus === "Complete") {
            return {
                queryResponse: startQueryResponse,
                results: queryResults,
            };
        } else {
            throw new Error(`Query did not complete successfully. Final status: ${queryStatus}`);
        }
    } catch (error) {
        console.error("Error running query:", error);
        throw error;
    }
};
