import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BinaryTelemetryCodec, GeofenceZone, GeofenceAlert, VehicleTelemetry } from '@fleetdash/shared';
import { CanvasEngine } from '../engine/CanvasEngine.js';

interface UseBinaryTelemetryOptions {
  socketUrl?: string;
  canvasEngineRef: React.RefObject<CanvasEngine | null>;
}

export function useBinaryTelemetry({ socketUrl = 'http://localhost:4000', canvasEngineRef }: UseBinaryTelemetryOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [latestAlert, setLatestAlert] = useState<GeofenceAlert | null>(null);
  const [throughputPps, setThroughputPps] = useState(0);
  const [activeVehiclesCount, setActiveVehiclesCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const packetCountRef = useRef(0);
  const lastPacketCalcTime = useRef(Date.now());

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Initial geofence metadata
    socket.on('geofences:init', (zones: GeofenceZone[]) => {
      setGeofences(zones);
      if (canvasEngineRef.current) {
        canvasEngineRef.current.setGeofences(zones);
      }
    });

    // High-frequency binary telemetry stream (ArrayBuffer)
    socket.on('telemetry:binary', (buffer: ArrayBuffer | Buffer) => {
      try {
        let arrayBuf: ArrayBuffer;
        if (buffer instanceof ArrayBuffer) {
          arrayBuf = buffer;
        } else if (ArrayBuffer.isView(buffer)) {
          const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          const copy = new Uint8Array(u8.byteLength);
          copy.set(u8);
          arrayBuf = copy.buffer as ArrayBuffer;
        } else {
          return;
        }

        const telemetries: VehicleTelemetry[] = BinaryTelemetryCodec.decode(arrayBuf);
        packetCountRef.current += telemetries.length;

        // Push directly to Canvas memory buffer (Zero React re-render overhead!)
        if (canvasEngineRef.current) {
          canvasEngineRef.current.updateVehiclesBatch(telemetries);
          setActiveVehiclesCount(canvasEngineRef.current.getVehiclesCount());
        }
      } catch (err) {
        // Binary decode error
      }
    });

    // Geofence alerts
    socket.on('telemetry:alert', (alert: GeofenceAlert) => {
      setLatestAlert(alert);
      setAlerts((prev) => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    });

    // Throughput calculator interval
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastPacketCalcTime.current) / 1000;
      if (deltaSec > 0) {
        setThroughputPps(Math.round(packetCountRef.current / deltaSec));
        packetCountRef.current = 0;
        lastPacketCalcTime.current = now;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [socketUrl, canvasEngineRef]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);

  return {
    isConnected,
    geofences,
    alerts,
    latestAlert,
    throughputPps,
    activeVehiclesCount,
    clearAlerts
  };
}

