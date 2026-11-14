import { redisClient } from "../redis/redisClient.js";
import { v4 as uuidv4 } from "uuid";

export interface LockResult {
  acquired: boolean;
  lockKey: string;
  fencingToken: string;
  expiresAt: number;
}

export class DistributedLockManager {
  private static defaultTtlMs: number = 5000;

  /**
   * Acquires a distributed lock using atomic Redis SET NX PX with unique fencing token.
   * Guarantees mutual exclusion across all distributed API Gateway instances.
   */
  public static async acquireLock(
    resourceId: string,
    ttlMs: number = this.defaultTtlMs
  ): Promise<LockResult> {
    const lockKey = `lock:ledgerguard:${resourceId}`;
    const fencingToken = uuidv4();

    // Redis atomic acquire: key, value, NX (only if not exists), PX (expiry in ms)
    const result = await redisClient.set(lockKey, fencingToken, "PX", ttlMs, "NX");

    if (result === "OK") {
      return {
        acquired: true,
        lockKey,
        fencingToken,
        expiresAt: Date.now() + ttlMs,
      };
    }

    return {
      acquired: false,
      lockKey,
      fencingToken: "",
      expiresAt: 0,
    };
  }

  /**
   * Safely releases a distributed lock using Lua script to verify fencing token ownership.
   * Prevents a slow process from releasing a lock that has expired and was re-acquired by another process!
   */
  public static async releaseLock(lockKey: string, fencingToken: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redisClient.eval(luaScript, 1, lockKey, fencingToken);
    return result === 1;
  }

  /**
   * Helper to execute an async critical section wrapped in a distributed lock
   */
  public static async withLock<T>(
    resourceId: string,
    action: () => Promise<T>,
    ttlMs: number = this.defaultTtlMs
  ): Promise<T> {
    const lock = await this.acquireLock(resourceId, ttlMs);
    if (!lock.acquired) {
      throw new Error(`CONCURRENCY_LOCK_FAILED: Resource [${resourceId}] is currently locked by another transaction.`);
    }

    try {
      return await action();
    } finally {
      await this.releaseLock(lock.lockKey, lock.fencingToken);
    }
  }
}
