import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { polygon, point } from '@turf/helpers';
import { GeofenceZone, GeofenceAlert, VehicleTelemetry } from '@fleetdash/shared';
import { messageBroker } from '../broker/pubsub.js';

export class GeofenceManager {
  private zones: GeofenceZone[] = [
    {
      id: 'GF-01',
      name: 'Electronic City Cargo Depot',
      type: 'DEPOT',
      color: '#3b82f6', // Blue
      coordinates: [
        [77.670, 12.835],
        [77.695, 12.835],
        [77.695, 12.855],
        [77.670, 12.855],
        [77.670, 12.835]
      ]
    },
    {
      id: 'GF-02',
      name: 'Central Industrial High-Risk Zone',
      type: 'RESTRICTED',
      color: '#ef4444', // Red
      maxSpeedLimitKmH: 40,
      coordinates: [
        [77.580, 12.960],
        [77.615, 12.960],
        [77.615, 12.990],
        [77.580, 12.990],
        [77.580, 12.960]
      ]
    },
    {
      id: 'GF-03',
      name: 'Airport Logistics Corridor',
      type: 'SPEED_ZONE',
      color: '#10b981', // Green
      maxSpeedLimitKmH: 80,
      coordinates: [
        [77.680, 13.180],
        [77.720, 13.180],
        [77.720, 13.220],
        [77.680, 13.220],
        [77.680, 13.180]
      ]
    }
  ];

  // Map of vehicleId -> Set of zoneIds currently inside
  private vehicleZoneState = new Map<string, Set<string>>();

  public getZones(): GeofenceZone[] {
    return this.zones;
  }

  public addZone(zone: GeofenceZone): void {
    this.zones.push(zone);
  }

  /**
   * Fast boundary intersection check using Turf.js
   */
  public evaluateTelemetry(telemetry: VehicleTelemetry): { inGeofence: boolean; alertTriggered: boolean } {
    let isInAnyZone = false;
    let alertTriggered = false;

    const pt = point([telemetry.longitude, telemetry.latitude]);
    let currentOccupied = this.vehicleZoneState.get(telemetry.vehicleId);
    if (!currentOccupied) {
      currentOccupied = new Set<string>();
      this.vehicleZoneState.set(telemetry.vehicleId, currentOccupied);
    }

    for (const zone of this.zones) {
      try {
        const poly = polygon([zone.coordinates]);
        const isInside = booleanPointInPolygon(pt, poly);

        if (isInside) {
          isInAnyZone = true;
          // State transition: Vehicle entered zone
          if (!currentOccupied.has(zone.id)) {
            currentOccupied.add(zone.id);
            alertTriggered = true;

            const alert: GeofenceAlert = {
              alertId: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              vehicleId: telemetry.vehicleId,
              geofenceId: zone.id,
              geofenceName: zone.name,
              type: 'GEOFENCE_BREACH',
              timestamp: telemetry.timestamp,
              latitude: telemetry.latitude,
              longitude: telemetry.longitude,
              speed: telemetry.speed,
              message: `Vehicle ${telemetry.vehicleId} breached ${zone.name} (${zone.type})`
            };

            messageBroker.publishAlert(alert);
          }

          // Speed limit violation inside zone
          if (zone.maxSpeedLimitKmH && telemetry.speed > zone.maxSpeedLimitKmH) {
            const speedAlert: GeofenceAlert = {
              alertId: `ALT-SPD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              vehicleId: telemetry.vehicleId,
              geofenceId: zone.id,
              geofenceName: zone.name,
              type: 'SPEED_VIOLATION',
              timestamp: telemetry.timestamp,
              latitude: telemetry.latitude,
              longitude: telemetry.longitude,
              speed: telemetry.speed,
              message: `Vehicle ${telemetry.vehicleId} exceeding limit in ${zone.name}: ${telemetry.speed} km/h (Limit: ${zone.maxSpeedLimitKmH} km/h)`
            };
            messageBroker.publishAlert(speedAlert);
          }
        } else {
          // Vehicle exited zone
          if (currentOccupied.has(zone.id)) {
            currentOccupied.delete(zone.id);
          }
        }
      } catch (err) {
        // Fallback for turf parsing edge cases
      }
    }

    telemetry.inGeofence = isInAnyZone;
    return { inGeofence: isInAnyZone, alertTriggered };
  }
}

export const geofenceManager = new GeofenceManager();

