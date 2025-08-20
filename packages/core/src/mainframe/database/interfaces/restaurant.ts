import { Types } from "mongoose";
import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export interface IRestaurantData {
    name: string;
    displayName: string;
    description?: string;
    
    // Location Info
    address: string;
    city: string;
    country: string;
    phone?: string;
    email?: string;
    
    // Business Hours
    businessHours: {
        [key: string]: { // monday, tuesday, etc.
            isOpen: boolean;
            openTime?: string; // "09:00"
            closeTime?: string; // "22:00"
        }
    };
    
    // Branding
    logoUrl?: string;
    coverImageUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    
    // Settings
    isActive: boolean;
    allowOnlineOrdering: boolean;
    currency: string;
    taxRate?: number;
    
    // Company reference (for tenant isolation)
    companyId: Types.ObjectId;
}

export interface IRestaurant extends IDataItem<IRestaurantData> {}
export interface IRestaurantMiddyModel extends IDataModel<IRestaurantData> {}