import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export enum UserRolesEnum {
    GLOBAL_ADMIN = "GLOBAL_ADMIN",
    ADMIN = "ADMIN",
    STUDENT = "STUDENT",
    TEACHER = "TEACHER",
    PARENT = "PARENT",
}
export interface IUserData {
    id: string,
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    role: UserRolesEnum;
    cognitoUsername: string;
    cognitoSub: string;
    academyId: string;
}


export interface IUser extends IDataItem<IUserData> {}
export interface IUserMiddyModel extends IDataModel<IUserData> {}
