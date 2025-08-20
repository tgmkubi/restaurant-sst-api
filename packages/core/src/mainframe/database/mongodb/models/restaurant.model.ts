import mongoose from 'mongoose';
import { IRestaurant } from "../../interfaces/restaurant";

const BusinessHoursSchema = new mongoose.Schema({
    isOpen: { type: Boolean, required: true },
    openTime: { type: String, required: false },
    closeTime: { type: String, required: false }
}, { _id: false });

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    description: { type: String, required: false },
    
    // Location Info
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: false, lowercase: true, trim: true },
    
    // Business Hours
    businessHours: {
        monday: BusinessHoursSchema,
        tuesday: BusinessHoursSchema,
        wednesday: BusinessHoursSchema,
        thursday: BusinessHoursSchema,
        friday: BusinessHoursSchema,
        saturday: BusinessHoursSchema,
        sunday: BusinessHoursSchema
    },
    
    // Branding
    logoUrl: { type: String, required: false },
    coverImageUrl: { type: String, required: false },
    primaryColor: { type: String, required: false },
    secondaryColor: { type: String, required: false },
    
    // Settings
    isActive: { type: Boolean, default: true, required: true },
    allowOnlineOrdering: { type: Boolean, default: true },
    currency: { type: String, default: 'TRY', required: true },
    taxRate: { type: Number, required: false },
    
    // Company reference (for tenant isolation)
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

// Compound indexes for tenant isolation and performance
RestaurantSchema.index({ companyId: 1, name: 1 }, { unique: true });
RestaurantSchema.index({ companyId: 1 }); // For listing restaurants by company
RestaurantSchema.index({ companyId: 1, isActive: 1 }); // For active restaurants
RestaurantSchema.index({ _id: 1, companyId: 1 }); // For get by ID with company check

export const RestaurantModel = mongoose.models.Restaurant || mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);