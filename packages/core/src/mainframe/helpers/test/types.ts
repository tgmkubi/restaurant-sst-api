export interface IErrorResponseDetail {
    message: string;
    cause?: string;
}

export interface IAxiosRequest<TBody> {
    url: string;
    method: string;
    body?: TBody;
    queryParameters?: IQueryParameters;
}

export interface IAxiosResponse<TPayload> {
    statusCode: number;
    data: TPayload;
    success: boolean;
    payload: TPayload;
}

export interface IQueryParameters {
    gt?: string;
    lt?: string;
    filterKey?: string;
    filterValue?: string;
    orderAsc?: boolean;
    regionId?: string;
}
