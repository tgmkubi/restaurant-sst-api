import mongoose from 'mongoose';

const MenuSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }],
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

// Compound indexes for tenant isolation and performance
MenuSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
MenuSchema.index({ restaurantId: 1, isActive: 1 });

export const MenuModel = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
