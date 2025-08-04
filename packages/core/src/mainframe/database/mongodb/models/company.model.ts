import mongoose from 'mongoose';
import { ICompany } from "../../interfaces/company";

const CompanySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true },

    vatNumber: { type: String, required: false, unique: true },
    adress: { type: String, required: false },
    email: { type: String, required: false, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: false },
    logoUrl: { type: String, required: false },

    displayName: { type: String, required: true },
    description: { type: String, required: false },
    domain: { type: String, required: true, unique: true, index: true },
    cognitoUserPoolId: { type: String, required: true, unique: true },
    cognitoClientId: { type: String, required: true, unique: true },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

export const CompanyModel = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
