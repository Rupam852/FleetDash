export interface GeofenceZone {
  id: string;
  name: string;
  type: "depot" | "restricted" | "customer_site" | "corridor";
  speedLimitKmph: number;
  geometry: {
    type: "Polygon" | "Point";
    coordinates: any;
    radiusMeters?: number;
  };
  isActive: boolean;
  alertEmail?: string;
}

export const INITIAL_GEOFENCE_ZONES: GeofenceZone[] = [
  {
    id: "geo-jnpt-01",
    name: "JNPT Container Terminal Hub",
    type: "depot",
    speedLimitKmph: 40,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [72.9300, 18.9400],
          [72.9700, 18.9400],
          [72.9700, 18.9800],
          [72.9300, 18.9800],
          [72.9300, 18.9400]
        ]
      ]
    },
    isActive: true
  },
  {
    id: "geo-pune-chakan-02",
    name: "Pune Chakan Industrial Logistics Park",
    type: "depot",
    speedLimitKmph: 50,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8300, 18.7200],
          [73.8800, 18.7200],
          [73.8800, 18.7800],
          [73.8300, 18.7800],
          [73.8300, 18.7200]
        ]
      ]
    },
    isActive: true
  },
  {
    id: "geo-mumbai-restricted-03",
    name: "South Mumbai Daytime Heavy Vehicle Restricted Zone",
    type: "restricted",
    speedLimitKmph: 30,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [72.8100, 18.9000],
          [72.8400, 18.9000],
          [72.8400, 18.9600],
          [72.8100, 18.9600],
          [72.8100, 18.9000]
        ]
      ]
    },
    isActive: true
  },
  {
    id: "geo-delhi-ncr-04",
    name: "Delhi NCR Freight Corridor Hub",
    type: "depot",
    speedLimitKmph: 60,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [77.0100, 28.4500],
          [77.1000, 28.4500],
          [77.1000, 28.5200],
          [77.0100, 28.5200],
          [77.0100, 28.4500]
        ]
      ]
    },
    isActive: true
  }
];

