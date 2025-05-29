import mongoose from 'mongoose';
import {IAcademy} from "../../interfaces/academy";

const AcademySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    domain: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: false },
    cognitoUserPoolId: { type: String, required: true, unique: true },
    cognitoClientId: { type: String, required: true, unique: true },

    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });

export const AcademyModel = mongoose.models.Academy || mongoose.model<IAcademy>('Academy', AcademySchema);
