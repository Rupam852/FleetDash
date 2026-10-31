import { parentPort } from 'worker_threads';
import { VehicleTelemetry } from '@fleetdash/shared';

export interface RawTelemetryInput {
  vId: string | number;
  lat: number;
  lng: number;
  spd?: number;
  hdg?: number;
  fuel?: number;
  ts?: number;
}

/**
 * Heavy coordinate parsing and validation executed off the main event loop
 */
function parseBatch(rawItems: RawTelemetryInput[]): VehicleTelemetry[] {
  const parsed: VehicleTelemetry[] = [];
  const now = Date.now();

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    if (!raw) continue;

    // Fast numeric ID conversion
    let numericId = 0;
    if (typeof raw.vId === 'number') {
      numericId = raw.vId;
    } else {
      const parsedNum = parseInt(String(raw.vId).replace(/\D/g, ''), 10);
      numericId = isNaN(parsedNum) ? i + 1 : parsedNum;
    }

    const latitude = Number(raw.lat);
    const longitude = Number(raw.lng);

    // Sanity boundary check (-90 to 90, -180 to 180)
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue;
    }

    const speed = Math.max(0, Math.min(220, Number(raw.spd ?? 45)));
    const heading = Math.max(0, Math.min(360, Math.round(Number(raw.hdg ?? 0))));
    const fuelLevel = Math.max(0, Math.min(100, Math.round(Number(raw.fuel ?? 80))));
    const timestamp = raw.ts && raw.ts > 0 ? Number(raw.ts) : now;

    parsed.push({
      numericId,
      vehicleId: typeof raw.vId === 'string' && raw.vId.startsWith('VH-') ? raw.vId : `VH-${numericId.toString().padStart(4, '0')}`,
      timestamp,
      latitude,
      longitude,
      speed,
      heading,
      fuelLevel,
      inGeofence: false
    });
  }

  return parsed;
}

if (parentPort) {
  parentPort.on('message', (payload: { id: string; items: RawTelemetryInput[] }) => {
    try {
      const result = parseBatch(payload.items);
      parentPort!.postMessage({ id: payload.id, success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown worker error';
      parentPort!.postMessage({ id: payload.id, success: false, error: message });
    }
  });
}

