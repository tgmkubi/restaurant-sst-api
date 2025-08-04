import { Types } from "mongoose";
import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export enum UserRolesEnum {
    GLOBAL_ADMIN = "GLOBAL_ADMIN",
    ADMIN = "ADMIN",
    SALES = "SALES",
    PURCHASING = "PURCHASING",
    CUSTOMER = "CUSTOMER",
}
export interface IUserData {
    id: string,
    cognitoSub: string;
    cognitoUsername: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRolesEnum;    
    companyId?: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUser extends IDataItem<IUserData> {}
export interface IUserMiddyModel extends IDataModel<IUserData> {}
