import { Types } from "mongoose";
import { IDataItem, IDataModel } from "../../helpers/interfaces/global";

export enum QRCodeTypeEnum {
    TABLE = "TABLE",
    TAKEAWAY = "TAKEAWAY",
    DELIVERY = "DELIVERY"
}

export interface IQRCodeData {
    // Identification
    code: string; // Unique QR code identifier
    displayName: string; // e.g., "Table 5", "Takeaway Counter"
    
    // Type and Location
    type: QRCodeTypeEnum;
    tableNumber?: string;
    location?: string; // e.g., "Ground Floor", "Terrace"
    
    // QR Code Details
    qrCodeUrl: string; // Generated QR code image URL
    targetUrl: string; // URL that QR code points to
    
    // Status
    isActive: boolean;
    isOccupied?: boolean; // For table QR codes
    
    // Analytics
    scanCount: number;
    lastScannedAt?: Date;
    
    // Relations
    restaurantId: Types.ObjectId;
    
    // Session Management (for table orders)
    currentSessionId?: string;
    sessionStartedAt?: Date;
}

export interface IQRCode extends IDataItem<IQRCodeData> {}
export interface IQRCodeMiddyModel extends IDataModel<IQRCodeData> {}