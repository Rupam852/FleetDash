import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { BinaryTelemetryCodec, VehicleTelemetry, GeofenceAlert, SystemMetrics } from '@fleetdash/shared';
import { messageBroker } from '../broker/pubsub.js';
import { geofenceManager } from '../geospatial/geofenceManager.js';

export class SocketManager {
  private io: SocketIOServer | null = null;
  private connectedSockets = new Set<Socket>();

  public init(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      perMessageDeflate: false // Disable compression for raw binary ArrayBuffers to reduce latency
    });

    this.io.on('connection', (socket) => {
      this.connectedSockets.add(socket);

      // Send initial static geofence configuration to the client
      socket.emit('geofences:init', geofenceManager.getZones());

      socket.on('disconnect', () => {
        this.connectedSockets.delete(socket);
      });
    });

    // Listen to broker and broadcast to clients via Binary ArrayBuffers
    messageBroker.onTelemetry((telemetries: VehicleTelemetry[]) => {
      this.broadcastTelemetryBinary(telemetries);
    });

    messageBroker.onAlert((alert: GeofenceAlert) => {
      this.broadcastAlert(alert);
    });

    console.log('[WebSockets] Socket.io binary server initialized with ArrayBuffer streaming.');
  }

  public getConnectedClientsCount(): number {
    return this.connectedSockets.size;
  }

  /**
   * Encodes the telemetry array to raw ArrayBuffer and broadcasts
   */
  public broadcastTelemetryBinary(telemetries: VehicleTelemetry[]): void {
    if (!this.io || this.connectedSockets.size === 0 || telemetries.length === 0) return;

    try {
      const buffer = BinaryTelemetryCodec.encode(telemetries);
      // Socket.io efficiently transmits Buffer/ArrayBuffer as raw binary frames
      this.io.emit('telemetry:binary', buffer);
    } catch (err) {
      console.error('[WebSockets] Binary encoding/broadcast error:', err);
    }
  }

  public broadcastAlert(alert: GeofenceAlert): void {
    if (!this.io) return;
    this.io.emit('telemetry:alert', alert);
  }

  public broadcastMetrics(metrics: SystemMetrics): void {
    if (!this.io) return;
    this.io.emit('system:metrics', metrics);
  }
}

export const socketManager = new SocketManager();

