import { VehicleTelemetry } from './types.js';

/**
 * High-Throughput Binary Telemetry Protocol
 * 
 * Frame Format:
 * [Magic (2 bytes)] 0xFD 0x01
 * [Count (2 bytes)] Uint16 (number of vehicle telemetry records)
 * Record Format (28 bytes each):
 * - numericId: Uint32 (4 bytes)
 * - timestamp: Float64 (8 bytes)
 * - latitude:  Float32 (4 bytes)
 * - longitude: Float32 (4 bytes)
 * - speed:     Float32 (4 bytes)
 * - heading:   Uint16  (2 bytes)
 * - fuelLevel: Uint8   (1 byte)
 * - flags:     Uint8   (1 byte) (bit 0: inGeofence)
 */

const MAGIC_BYTE_1 = 0xFD;
const MAGIC_BYTE_2 = 0x01;
const HEADER_SIZE = 4;
const RECORD_SIZE = 28;

export class BinaryTelemetryCodec {
  /**
   * Encode an array of vehicle telemetry points into a compact ArrayBuffer
   */
  public static encode(telemetries: VehicleTelemetry[]): ArrayBuffer {
    const count = telemetries.length;
    const totalBytes = HEADER_SIZE + count * RECORD_SIZE;
    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);

    // Header
    view.setUint8(0, MAGIC_BYTE_1);
    view.setUint8(1, MAGIC_BYTE_2);
    view.setUint16(2, count, true); // Little endian

    let offset = HEADER_SIZE;
    for (let i = 0; i < count; i++) {
      const item = telemetries[i];
      if (!item) continue;

      view.setUint32(offset, item.numericId, true);
      view.setFloat64(offset + 4, item.timestamp, true);
      view.setFloat32(offset + 12, item.latitude, true);
      view.setFloat32(offset + 16, item.longitude, true);
      view.setFloat32(offset + 20, item.speed, true);
      view.setUint16(offset + 24, item.heading, true);
      view.setUint8(offset + 26, Math.min(100, Math.max(0, Math.round(item.fuelLevel))));
      
      let flags = 0;
      if (item.inGeofence) flags |= 0x01;
      view.setUint8(offset + 27, flags);

      offset += RECORD_SIZE;
    }

    return buffer;
  }

  /**
   * Decode an ArrayBuffer into VehicleTelemetry array
   */
  public static decode(buffer: ArrayBuffer): VehicleTelemetry[] {
    const view = new DataView(buffer);
    if (view.byteLength < HEADER_SIZE) {
      throw new Error('Buffer too small for FleetDash binary header');
    }

    const m1 = view.getUint8(0);
    const m2 = view.getUint8(1);
    if (m1 !== MAGIC_BYTE_1 || m2 !== MAGIC_BYTE_2) {
      throw new Error(`Invalid Magic Header: 0x${m1.toString(16)} 0x${m2.toString(16)}`);
    }

    const count = view.getUint16(2, true);
    const expectedSize = HEADER_SIZE + count * RECORD_SIZE;
    if (view.byteLength < expectedSize) {
      throw new Error(`Buffer underflow: expected ${expectedSize} bytes, got ${view.byteLength}`);
    }

    const result: VehicleTelemetry[] = new Array(count);
    let offset = HEADER_SIZE;

    for (let i = 0; i < count; i++) {
      const numericId = view.getUint32(offset, true);
      const timestamp = view.getFloat64(offset + 4, true);
      const latitude = view.getFloat32(offset + 12, true);
      const longitude = view.getFloat32(offset + 16, true);
      const speed = view.getFloat32(offset + 20, true);
      const heading = view.getUint16(offset + 24, true);
      const fuelLevel = view.getUint8(offset + 26);
      const flags = view.getUint8(offset + 27);

      result[i] = {
        numericId,
        vehicleId: `VH-${numericId.toString().padStart(4, '0')}`,
        timestamp,
        latitude,
        longitude,
        speed: Math.round(speed * 10) / 10,
        heading,
        fuelLevel,
        inGeofence: (flags & 0x01) === 0x01
      };

      offset += RECORD_SIZE;
    }

    return result;
  }
}

