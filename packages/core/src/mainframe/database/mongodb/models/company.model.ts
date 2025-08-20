import mongoose from 'mongoose';
import { ICompany } from "../../interfaces/company";

const CompanySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    description: { type: String, required: false }, // Optional description
    domain: { type: String, required: true, unique: true, index: true }, // Auto-generated: subdomain.qrlist.com
    cognitoUserPoolId: { type: String, required: true, unique: true },
    cognitoClientId: { type: String, required: true, unique: true },

    // Business Info
    vatNumber: { type: String, required: false, unique: true, sparse: true },
    address: { type: String, required: false },
    email: { type: String, required: false, unique: true, lowercase: true, trim: true, sparse: true },
    phone: { type: String, required: false },
    logoUrl: { type: String, required: false },

    // Multi-tenant specific
    databaseName: { type: String, required: true, unique: true, index: true }, // e.g., 'quickbite_company'
    subdomain: { type: String, required: true, unique: true, index: true }, // e.g., 'quickbite'
    
    // Subscription & Licensing
    isActive: { type: Boolean, default: true, required: true },
    subscriptionPlan: { type: String, required: false },
    licenseExpiresAt: { type: Date, required: false },
    maxRestaurants: { type: Number, default: 1 },
    maxUsers: { type: Number, default: 10 },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

export const CompanyModel = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
