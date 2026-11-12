import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

const kvStore = new Map<string, string>();

const mockRedisClient = {
  get: async (key: string): Promise<string | null> => kvStore.get(key) ?? null,
  set: async (key: string, value: string, ...args: Array<string | number>): Promise<"OK" | null> => {
    const hasNx = args.includes("NX");
    if (hasNx && kvStore.has(key)) {
      return null;
    }
    kvStore.set(key, value);
    return "OK";
  },
  eval: async (_script: string, _numKeys: number, key: string, expectedToken: string): Promise<number> => {
    if (kvStore.get(key) === expectedToken) {
      kvStore.delete(key);
      return 1;
    }
    return 0;
  },
  quit: async (): Promise<"OK"> => "OK",
};

jest.unstable_mockModule("../src/redis/redisClient.js", () => ({
  redisClient: mockRedisClient,
  RedisConnectionManager: {
    getInstance: () => ({ getClient: () => mockRedisClient, close: async () => undefined }),
  },
}));

const { DistributedLockManager } = await import("../src/locks/distributedLock.js");
const { redisClient } = await import("../src/redis/redisClient.js");

describe("Distributed Lock & Idempotency Engine", () => {
  beforeEach(() => {
    kvStore.clear();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it("should acquire and release distributed lock cleanly", async () => {
    const lock = await DistributedLockManager.acquireLock("test_resource_1", 2000);
    expect(lock.acquired).toBe(true);
    expect(lock.fencingToken).toBeDefined();

    const released = await DistributedLockManager.releaseLock(lock.lockKey, lock.fencingToken);
    expect(released).toBe(true);
  });

  it("should block concurrent lock acquisition on the same resource", async () => {
    const lock1 = await DistributedLockManager.acquireLock("contested_resource", 3000);
    expect(lock1.acquired).toBe(true);

    const lock2 = await DistributedLockManager.acquireLock("contested_resource", 3000);
    expect(lock2.acquired).toBe(false);

    const wrongTokenRelease = await DistributedLockManager.releaseLock(lock1.lockKey, "forged-token");
    expect(wrongTokenRelease).toBe(false);

    const released = await DistributedLockManager.releaseLock(lock1.lockKey, lock1.fencingToken);
    expect(released).toBe(true);
  });
});
