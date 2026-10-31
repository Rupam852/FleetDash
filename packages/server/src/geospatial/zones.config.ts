import { GeofenceZone } from '@fleetdash/shared';

/**
 * Logistics Depot & High-Risk Geofence Zone Definitions
 * Maintained by: Anish Das (Backend & Geospatial Engineer)
 */
export const DEFAULT_GEOFENCE_ZONES: GeofenceZone[] = [
  {
    id: 'GF-01',
    name: 'Electronic City Cargo Depot',
    type: 'DEPOT',
    color: '#3b82f6',
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
    color: '#ef4444',
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
    color: '#10b981',
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
