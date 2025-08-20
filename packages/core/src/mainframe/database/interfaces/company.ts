import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export interface ICompanyData {
    name: string;
    displayName: string;
    description?: string; // Optional description
    domain: string; // Auto-generated from subdomain (e.g., 'quickbite.qrlist.com')
    cognitoUserPoolId: string;
    cognitoClientId: string;

    // Business Info
    vatNumber?: string;
    address?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;

    // Multi-tenant specific
    databaseName: string; // Tenant-specific database name (e.g., 'quickbite_company')
    subdomain: string; // For subdomain routing (e.g., 'quickbite' for quickbite.qrlist.com)

    // Subscription & Licensing
    isActive: boolean;
    subscriptionPlan?: string;
    licenseExpiresAt?: Date;
    maxRestaurants?: number;
    maxUsers?: number;

    // Virtual fields (populated from tenant database)
    admins?: any[]; // Will be populated from tenant database
}

export interface ICompany extends IDataItem<ICompanyData>, ICompanyData { }

export interface ICompanyMiddyModel extends IDataModel<ICompanyData> { }
