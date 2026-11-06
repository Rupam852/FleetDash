import mongoose, { Schema, Document } from "mongoose";

export interface IVehicleDocument extends Document {
  vehicleNumber: string;
  size: "20 ft" | "32 ft" | "40 ft" | "Trailer";
  capacityTonnes: number;
  manufacturer: "Tata" | "Ashok Leyland" | "BharatBenz" | "Mahindra";
  driverName: string;
  driverContact: string;
  supplierName?: string;
  supplierContact?: string;
  status: "AVAILABLE" | "IN_TRANSIT" | "MAINTENANCE" | "TENTATIVE";
  ownership: "OWN" | "HIRED";
  currentLocation: {
    lat: number;
    lng: number;
    locationName: string;
    speedKmph: number;
    heading: number;
  };
}

const VehicleSchema = new Schema<IVehicleDocument>(
  {
    vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    size: {
      type: String,
      enum: ["20 ft", "32 ft", "40 ft", "Trailer"],
      required: true,
      default: "40 ft",
    },
    capacityTonnes: { type: Number, required: true, default: 28 },
    manufacturer: {
      type: String,
      enum: ["Tata", "Ashok Leyland", "BharatBenz", "Mahindra"],
      required: true,
      default: "Tata",
    },
    driverName: { type: String, default: "Unassigned" },
    driverContact: { type: String, default: "N/A" },
    supplierName: { type: String, default: "" },
    supplierContact: { type: String, default: "" },
    status: {
      type: String,
      enum: ["AVAILABLE", "IN_TRANSIT", "MAINTENANCE", "TENTATIVE"],
      default: "AVAILABLE",
    },
    ownership: {
      type: String,
      enum: ["OWN", "HIRED"],
      default: "OWN",
    },
    currentLocation: {
      lat: { type: Number, required: true, default: 18.9812 },
      lng: { type: Number, required: true, default: 73.1124 },
      locationName: { type: String, default: "Yard / In Transit" },
      speedKmph: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
    },
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

VehicleSchema.index({ vehicleNumber: 1 });
VehicleSchema.index({ status: 1 });

export const VehicleModel = mongoose.model<IVehicleDocument>("Vehicle", VehicleSchema);

