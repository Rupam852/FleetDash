import mongoose, { Schema, Document } from "mongoose";

export interface IDriverDocument extends Document {
  driverId?: string;
  name: string;
  phone: string;
  password?: string;
  approvalStatus: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  licenseNumber: string;
  licenseExpiryDate: string;
  assignedVehicleNumber?: string;
  status: "ON_DUTY" | "AVAILABLE" | "ON_LEAVE";
  experienceYears: number;
  bloodGroup: string;
}

const DriverSchema = new Schema<IDriverDocument>(
  {
    driverId: { type: String, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, default: "Driver@123" },
    approvalStatus: {
      type: String,
      enum: ["APPROVED", "PENDING_APPROVAL", "REJECTED"],
      default: "APPROVED",
    },
    licenseNumber: { type: String, required: true, unique: true, uppercase: true },
    licenseExpiryDate: { type: String, required: true },
    assignedVehicleNumber: { type: String },
    status: {
      type: String,
      enum: ["ON_DUTY", "AVAILABLE", "ON_LEAVE"],
      default: "AVAILABLE",
    },
    experienceYears: { type: Number, required: true, default: 5 },
    bloodGroup: { type: String, default: "O+" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DriverSchema.index({ licenseNumber: 1 });
DriverSchema.index({ status: 1 });

export const DriverModel = mongoose.model<IDriverDocument>("Driver", DriverSchema);

