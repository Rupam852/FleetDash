import "dotenv/config";
import { Redis, RedisOptions } from "ioredis";

export class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private client: Redis;

  private constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379", 10);
    const password = process.env.REDIS_PASSWORD || undefined;
    const useTls =
      Boolean(redisUrl?.startsWith("rediss://")) ||
      host.includes("upstash.io") ||
      process.env.REDIS_TLS === "true";

    const commonOptions: RedisOptions = {
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      ...(useTls ? { tls: {} } : {}),
    };

    this.client = redisUrl
      ? new Redis(redisUrl, commonOptions)
      : new Redis({
          host,
          port,
          password,
          ...commonOptions,
        });

    const displayHost = redisUrl ? new URL(redisUrl).host : `${host}:${port}`;

    this.client.on("connect", () => {
      console.log(`[RedisConnectionManager] Connected to Redis at ${displayHost}`);
    });

    this.client.on("error", (err) => {
      console.error("[RedisConnectionManager] Redis client error:", err.message);
    });
  }

  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = RedisConnectionManager.getInstance().getClient();
