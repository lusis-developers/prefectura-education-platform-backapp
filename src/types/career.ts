import type { Types } from "mongoose";

export interface ICareer {
  _id: Types.ObjectId;
  name: string;
  slogan?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  courseIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

