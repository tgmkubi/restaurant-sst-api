
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true },
    imageUrl: { type: String, required: false }, // S3 public URL
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

ProductSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);