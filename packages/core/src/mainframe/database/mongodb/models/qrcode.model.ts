
import mongoose from 'mongoose';

const QRCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    qrCodeUrl: { type: String, required: true },
    targetUrl: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

QRCodeSchema.index({ restaurantId: 1, code: 1 }, { unique: true });

export const QRCodeModel = mongoose.models.QRCode || mongoose.model('QRCode', QRCodeSchema);