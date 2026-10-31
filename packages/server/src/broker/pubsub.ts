import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { CONFIG } from '../config/env.js';
import { VehicleTelemetry, GeofenceAlert } from '@fleetdash/shared';

class MessageBroker extends EventEmitter {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isRedisAvailable = false;

  public async init(): Promise<void> {
    try {
      this.publisher = new Redis({
        host: CONFIG.REDIS_HOST,
        port: CONFIG.REDIS_PORT,
        password: CONFIG.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true
      });

      this.subscriber = new Redis({
        host: CONFIG.REDIS_HOST,
        port: CONFIG.REDIS_PORT,
        password: CONFIG.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true
      });

      await this.publisher.connect();
      await this.subscriber.connect();

      await this.subscriber.subscribe('telemetry:stream', 'telemetry:alerts');
      this.subscriber.on('message', (channel, message) => {
        try {
          const parsed = JSON.parse(message);
          this.emit(channel, parsed);
        } catch (err) {
          console.error('[Broker] Failed to parse Redis message:', err);
        }
      });

      this.isRedisAvailable = true;
      console.log('[Broker] Redis Pub/Sub connected successfully (telemetry:stream, telemetry:alerts).');
    } catch (err) {
      console.warn('[Broker] Redis not available at configured host. Operating in high-speed in-memory Pub/Sub mode.');
      this.isRedisAvailable = false;
    }
  }

  public publishTelemetry(telemetries: VehicleTelemetry[]): void {
    if (this.isRedisAvailable && this.publisher) {
      this.publisher.publish('telemetry:stream', JSON.stringify(telemetries)).catch(() => {});
    } else {
      // In-memory decoupled broadcast
      setImmediate(() => {
        this.emit('telemetry:stream', telemetries);
      });
    }
  }

  public publishAlert(alert: GeofenceAlert): void {
    if (this.isRedisAvailable && this.publisher) {
      this.publisher.publish('telemetry:alerts', JSON.stringify(alert)).catch(() => {});
    } else {
      setImmediate(() => {
        this.emit('telemetry:alerts', alert);
      });
    }
  }

  public onTelemetry(callback: (data: VehicleTelemetry[]) => void): void {
    this.on('telemetry:stream', callback);
  }

  public onAlert(callback: (alert: GeofenceAlert) => void): void {
    this.on('telemetry:alerts', callback);
  }
}

export const messageBroker = new MessageBroker();

