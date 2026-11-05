export type NavigationTab =
  | "dashboard"
  | "lr_management"
  | "active_shipments"
  | "past_shipments"
  | "geofencing"
  | "live_tracking"
  | "vehicles"
  | "drivers"
  | "suppliers";

export type VehicleStatus = "AVAILABLE" | "IN_TRANSIT" | "MAINTENANCE" | "TENTATIVE";

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  size: "20 ft" | "32 ft" | "40 ft" | "Trailer";
  capacityTonnes: number;
  manufacturer: "Tata" | "Ashok Leyland" | "BharatBenz" | "Mahindra";
  driverName: string;
  driverContact: string;
  supplierName?: string;
  supplierContact?: string;
  status: VehicleStatus;
  ownership: "OWN" | "HIRED";
  currentLocation: {
    lat: number;
    lng: number;
    locationName: string;
    speedKmph: number;
    heading: number;
  };
}

export type ShipmentStatus = "PENDING" | "ASSIGNED" | "LOADING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface Shipment {
  id: string;
  lrNumber: string;
  lrDate: string;
  poDate?: string;
  clientName: string;
  sectionType: "Full Truck Load" | "Part Truck Load" | "Express Cargo";
  containerType: "20 ft Standard" | "32 ft" | "40 ft High Cube" | "Trailer" | "Open Top" | "Reefer" | "Flat Rack";
  pickupLocation: string;
  destination: string;
  returnLocation?: string;
  port?: string;
  shippingAgent?: string;
  bookingNumber?: string;
  jobNumber?: string;
  referenceNumber?: string;
  poNumber?: string;
  weightTonnes: number;
  containerNumber?: string;
  sealNumber?: string;
  lrValidityDate?: string;
  specialInstructions?: string;
  vehicleNumber: string;
  driverName: string;
  driverContact: string;
  supplierName?: string;
  supplierContact?: string;
  status: ShipmentStatus;
  eWayBillNumber?: string;
  eWayBillExpiryHours?: number; // hours remaining
  timeline: {
    title: string;
    location: string;
    timestamp: string;
    completed: boolean;
  }[];
  geofencePassed: string[];
}

export interface GeofenceZone {
  id: string;
  name: string;
  shape: "Circle" | "Polygon";
  lat: number;
  lng: number;
  radiusMeters?: number;
  polygonPoints?: [number, number][];
  category: "Port Hub" | "Industrial Zone" | "Restricted Zone" | "Depot";
  speedLimitKmph: number;
  isActive: boolean;
}

export interface Driver {
  id: string;
  driverId?: string;
  name: string;
  phone: string;
  password?: string;
  approvalStatus?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  licenseNumber: string;
  licenseExpiryDate: string;
  assignedVehicleNumber?: string;
  status: "ON_DUTY" | "AVAILABLE" | "ON_LEAVE";
  experienceYears: number;
  bloodGroup: string;
}

export interface AuthUser {
  role: "OFFICE_MANAGER" | "DRIVER";
  email?: string;
  name?: string;
  driver?: Driver;
}

export interface Supplier {
  id: string;
  name: string;
  vendorCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  fleetCount: number;
  rating: number; // 1 to 5
  status: "ACTIVE" | "INACTIVE";
  contractValidTill: string;
}

export interface LiveAlert {
  id: string;
  title: string;
  type: "GEOFENCE_BREACH" | "EWAY_EXPIRY" | "SPEED_VIOLATION" | "SYSTEM";
  message: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  vehicleNumber?: string;
}

