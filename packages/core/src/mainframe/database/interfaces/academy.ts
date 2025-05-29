import { IDataItem, IDataModel } from "../../helpers/interfaces/global";


export interface IAcademyData {
    name: string;
    displayName: string;
    description: string;
    domain: string;
    cognitoUserPoolId: string;
    cognitoClientId: string;
}


export interface IAcademy extends IDataItem<IAcademyData> {}

export interface IAcademyMiddyModel extends IDataModel<IAcademyData> {}
