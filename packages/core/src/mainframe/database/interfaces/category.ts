import { Types } from "mongoose";
import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export interface ICategoryData {
    name: string;
    displayName: string;
    description?: string;
    
    // Visual
    imageUrl?: string;
    iconUrl?: string;
    
    // Ordering
    sortOrder: number;
    
    // Status
    isActive: boolean;
    isAvailable: boolean;
    
    // Relations
    restaurantId: Types.ObjectId;
    parentCategoryId?: Types.ObjectId; // For subcategories
}

export interface ICategory extends IDataItem<ICategoryData> {}
export interface ICategoryMiddyModel extends IDataModel<ICategoryData> {}