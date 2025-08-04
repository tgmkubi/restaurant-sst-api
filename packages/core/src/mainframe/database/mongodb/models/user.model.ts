import mongoose from 'mongoose';
import {IUser, UserRolesEnum} from "../../interfaces/user";


const UserSchema = new mongoose.Schema({
    cognitoSub: { type: String, required: true, unique: true, index: true },
    cognitoUsername: { type: String, required: true},
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: UserRolesEnum, default: UserRolesEnum.CUSTOMER, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
