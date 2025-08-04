import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export interface ICompanyData {
    name: string;
    displayName: string;
    description: string;
    domain: string;
    cognitoUserPoolId: string;
    cognitoClientId: string;

    vatNumber?: string;
    address?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
}

export interface ICompany extends IDataItem<ICompanyData> {}

export interface ICompanyMiddyModel extends IDataModel<ICompanyData> {}
