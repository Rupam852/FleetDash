import { GeofenceZone } from "./zones.js";

export interface AlertEvent {
  id: string;
  vehicleId: string;
  geofenceId: string;
  geofenceName: string;
  eventType: "ENTER" | "EXIT" | "SPEED_VIOLATION";
  occurredAt: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
  speedLimitKmph?: number;
  message: string;
}

/**
 * High-performance Point-In-Polygon ray-casting implementation
 * Compatible with GeoJSON Polygon coordinate rings [longitude, latitude]
 */
export function isPointInPolygon(
  point: [number, number], // [longitude, latitude]
  polygonCoords: number[][][]
): boolean {
  const [x, y] = point;
  const ring = polygonCoords[0]; // outer boundary
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Checks distance for circular geofences using Haversine formula
 */
export function isPointInCircle(
  point: [number, number], // [lon, lat]
  center: [number, number], // [lon, lat]
  radiusMeters: number
): boolean {
  const R = 6371000; // Earth radius in meters
  const dLat = ((point[1] - center[1]) * Math.PI) / 180;
  const dLon = ((point[0] - center[0]) * Math.PI) / 180;
  const lat1 = (center[1] * Math.PI) / 180;
  const lat2 = (point[1] * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusMeters;
}

export function evaluateGeofence(
  zone: GeofenceZone,
  latitude: number,
  longitude: number
): boolean {
  if (!zone.isActive) return false;

  if (zone.geometry.type === "Polygon") {
    return isPointInPolygon([longitude, latitude], zone.geometry.coordinates);
  }

  if (zone.geometry.type === "Point" && zone.geometry.radiusMeters) {
    const center = zone.geometry.coordinates as [number, number];
    return isPointInCircle([longitude, latitude], center, zone.geometry.radiusMeters);
  }

  return false;
}

