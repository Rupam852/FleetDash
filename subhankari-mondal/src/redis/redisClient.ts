import { Redis } from "ioredis";

export class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private client: Redis;

  private constructor() {
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379", 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on("connect", () => {
      console.log(`[RedisConnectionManager] Connected to Redis at ${host}:${port}`);
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
