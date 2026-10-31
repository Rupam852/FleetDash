export interface VehicleTelemetry {
  vehicleId: string;
  numericId: number; // Fast binary indexing
  timestamp: number;
  latitude: number;
  longitude: number;
  speed: number;       // in km/h
  heading: number;     // 0-360 degrees
  fuelLevel: number;   // 0-100%
  inGeofence: boolean;
}

export type AlertType = 'GEOFENCE_BREACH' | 'SPEED_VIOLATION' | 'FUEL_ANOMALY';

export interface GeofenceAlert {
  alertId: string;
  vehicleId: string;
  geofenceId: string;
  geofenceName: string;
  type: AlertType;
  timestamp: number;
  latitude: number;
  longitude: number;
  speed: number;
  message: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'RESTRICTED' | 'DEPOT' | 'SPEED_ZONE';
  color: string;
  // GeoJSON Polygon coordinates [lng, lat][]
  coordinates: [number, number][];
  maxSpeedLimitKmH?: number;
}

export interface SystemMetrics {
  ingestionRatePerSec: number;
  dbQueryLatencyMs: number;
  activeVehiclesCount: number;
  totalAlertsTriggered: number;
  connectedClients: number;
  renderingFps: number;
  memoryUsageMb: number;
}

