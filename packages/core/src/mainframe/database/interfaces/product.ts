import { Types } from "mongoose";
import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export interface IProductVariant {
    name: string;
    price: number;
    isDefault?: boolean;
}

export interface IProductAddon {
    name: string;
    price: number;
    isRequired?: boolean;
    maxSelections?: number;
    options: {
        name: string;
        price: number;
    }[];
}

export interface IProductData {
    name: string;
    displayName: string;
    description?: string;
    
    // Pricing
    basePrice: number;
    variants?: IProductVariant[];
    addons?: IProductAddon[];
    
    // Visual
    imageUrl?: string;
    images?: string[];
    
    // Nutritional Info
    calories?: number;
    allergens?: string[];
    ingredients?: string[];
    
    // Availability
    isActive: boolean;
    isAvailable: boolean;
    availableFrom?: Date;
    availableTo?: Date;
    
    // Inventory
    hasInventoryTracking: boolean;
    stockQuantity?: number;
    lowStockThreshold?: number;
    
    // Ordering
    sortOrder: number;
    preparationTime?: number; // in minutes
    
    // Relations
    restaurantId: Types.ObjectId;
    categoryId: Types.ObjectId;
    
    // Tags for filtering
    tags?: string[];
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isSpicy?: boolean;
}

export interface IProduct extends IDataItem<IProductData> {}
export interface IProductMiddyModel extends IDataModel<IProductData> {}