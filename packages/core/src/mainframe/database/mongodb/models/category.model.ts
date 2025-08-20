
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    description: { type: String },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

CategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);