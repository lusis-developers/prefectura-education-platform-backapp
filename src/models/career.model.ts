import { Schema, model } from "mongoose";
import type { ICareer } from "../types/career";

const CareerSchema = new Schema<ICareer>(
  {
    name: { type: String, required: true },
    slogan: { type: String, default: null },
    description: { type: String, default: null },
    imageUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    courseIds: { type: [Number], default: [] },
  },
  { timestamps: true, versionKey: false },
);

CareerSchema.index({ name: 1 }, { unique: true });

export const CareerModel = model<ICareer>("careers", CareerSchema);
