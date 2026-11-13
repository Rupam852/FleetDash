import { ITenantAuditLog, ITenantInvoice, ITenantMaster } from "../../src/types/models.js";

export type StoredInvoice = ITenantInvoice & { _id: string };
export type StoredAuditLog = ITenantAuditLog & { _id: string };
export type StoredTenant = ITenantMaster & { _id: string };

interface RedisSetOptions {
  nx?: boolean;
  ex?: number;
}

interface TenantStore {
  invoices: StoredInvoice[];
  auditLogs: StoredAuditLog[];
}

interface PendingTxOp {
  apply: () => void;
}

export class MockClientSession {
  public readonly ops: PendingTxOp[] = [];
  private active = false;

  public inTransaction(): boolean {
    return this.active;
  }

  public startTransaction(): void {
    this.active = true;
    this.ops.length = 0;
  }

  public stage(op: () => void): void {
    if (this.active) {
      this.ops.push({ apply: op });
    } else {
      op();
    }
  }

  public commitTransaction(): void {
    for (const op of this.ops) {
      op.apply();
    }
    this.ops.length = 0;
    this.active = false;
  }

  public async abortTransaction(): Promise<void> {
    this.ops.length = 0;
    this.active = false;
  }

  public async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    this.startTransaction();
    try {
      const result = await fn();
      this.commitTransaction();
      return result;
    } catch (err) {
      await this.abortTransaction();
      throw err;
    }
  }

  public async endSession(): Promise<void> {
    this.ops.length = 0;
    this.active = false;
  }
}

export class InMemoryInfra {
  public readonly redisStore = new Map<string, string>();
  public readonly masterTenants: StoredTenant[] = [];
  public readonly tenantStores = new Map<string, TenantStore>();
  private idCounter = 1;

  public reset(): void {
    this.redisStore.clear();
    this.masterTenants.length = 0;
    this.tenantStores.clear();
    this.idCounter = 1;
  }

  public nextId(prefix = "doc"): string {
    const num = this.idCounter++;
    return `${prefix}_${num}`;
  }

  public getTenantStore(tenantId: string): TenantStore {
    const clean = (tenantId || "default").toLowerCase().trim();
    let store = this.tenantStores.get(clean);
    if (!store) {
      store = { invoices: [], auditLogs: [] };
      this.tenantStores.set(clean, store);
    }
    return store;
  }

  public buildMocks() {
    const self = this;

    const redis = {
      ping: async (): Promise<string> => "PONG",
      get: async <T = string>(key: string): Promise<T | null> => {
        const val = self.redisStore.get(key);
        return val === undefined ? null : (val as unknown as T);
      },
      set: async (key: string, value: unknown, opts?: RedisSetOptions): Promise<"OK" | null> => {
        if (opts?.nx && self.redisStore.has(key)) {
          return null;
        }
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        self.redisStore.set(key, serialized);
        return "OK";
      },
      del: async (...keys: string[]): Promise<number> => {
        let deleted = 0;
        for (const k of keys) {
          if (self.redisStore.delete(k)) deleted++;
        }
        return deleted;
      },
      eval: async (_script: string, keys: string[], args: string[]): Promise<number> => {
        const key = keys[0];
        const expected = args[0];
        if (key && self.redisStore.get(key) === expected) {
          self.redisStore.delete(key);
          return 1;
        }
        return 0;
      },
    };

    const matchesFilter = <T extends Record<string, unknown>>(doc: T, filter: Record<string, unknown>): boolean => {
      for (const [k, v] of Object.entries(filter)) {
        if (v && typeof v === "object" && "$gte" in v) {
          const threshold = (v as { $gte: Date }).$gte;
          const docDate = doc[k] instanceof Date ? (doc[k] as Date) : new Date(String(doc[k] ?? 0));
          if (docDate < threshold) return false;
          continue;
        }
        if (doc[k] !== v) {
          return false;
        }
      }
      return true;
    };

    const wrapTenantDoc = (target: StoredTenant) => {
      return {
        ...target,
        get tenantId() {
          return target.tenantId;
        },
        set tenantId(val: string) {
          target.tenantId = val;
        },
        get name() {
          return target.name;
        },
        set name(val: string) {
          target.name = val;
        },
        get tier() {
          return target.tier;
        },
        set tier(val: ITenantMaster["tier"]) {
          target.tier = val;
        },
        get status() {
          return target.status;
        },
        set status(val: ITenantMaster["status"]) {
          target.status = val;
        },
        get homeState() {
          return target.homeState;
        },
        set homeState(val: string | undefined) {
          target.homeState = val;
        },
        get subdomain() {
          return target.subdomain;
        },
        set subdomain(val: string) {
          target.subdomain = val;
        },
        get passwordHash() {
          return target.passwordHash;
        },
        set passwordHash(val: string | null | undefined) {
          target.passwordHash = val;
        },
        get isPasswordProtected() {
          return target.isPasswordProtected;
        },
        set isPasswordProtected(val: boolean | undefined) {
          target.isPasswordProtected = val;
        },
        save: async () => target,
        toObject: () => ({ ...target }),
      };
    };

    const TenantMasterModel = {
      find: (filter: Record<string, unknown> = {}) => {
        let sortDir = 1;
        const execFind = (): StoredTenant[] => {
          const matched = self.masterTenants.filter((t) =>
            matchesFilter(t as unknown as Record<string, unknown>, filter)
          );
          return [...matched].sort((a, b) => {
            const ta = a.createdAt ? a.createdAt.getTime() : 0;
            const tb = b.createdAt ? b.createdAt.getTime() : 0;
            return (ta - tb) * sortDir;
          });
        };
        const chain = {
          sort: (sortSpec: { createdAt?: number }) => {
            sortDir = sortSpec.createdAt === -1 ? -1 : 1;
            return chain;
          },
          lean: async (): Promise<StoredTenant[]> => execFind().map((t) => ({ ...t })),
          then: (onFulfilled: (val: StoredTenant[]) => unknown, onRejected?: (err: unknown) => unknown) =>
            Promise.resolve(execFind().map((t) => ({ ...t }))).then(onFulfilled, onRejected),
        };
        return chain;
      },
      findOne: (filter: Record<string, unknown>) => {
        const locate = (): StoredTenant | undefined =>
          self.masterTenants.find((t) => matchesFilter(t as unknown as Record<string, unknown>, filter));

        const chain = {
          lean: async (): Promise<StoredTenant | null> => {
            const found = locate();
            return found ? { ...found } : null;
          },
          then: (
            onFulfilled: (val: ReturnType<typeof wrapTenantDoc> | null) => unknown,
            onRejected?: (err: unknown) => unknown
          ) => {
            const found = locate();
            return Promise.resolve(found ? wrapTenantDoc(found) : null).then(onFulfilled, onRejected);
          },
        };
        return chain;
      },
      create: async (doc: Omit<ITenantMaster, "createdAt" | "updatedAt">) => {
        const now = new Date();
        const stored: StoredTenant = {
          _id: self.nextId("tenant"),
          tenantId: doc.tenantId,
          name: doc.name,
          subdomain: doc.subdomain,
          databaseName: doc.databaseName,
          tier: doc.tier || "ENTERPRISE",
          status: doc.status || "ACTIVE",
          homeState: doc.homeState || "West Bengal (19)",
          passwordHash: doc.passwordHash ?? null,
          isPasswordProtected: Boolean(doc.passwordHash),
          createdAt: now,
          updatedAt: now,
        };
        self.masterTenants.push(stored);
        return wrapTenantDoc(stored);
      },
      deleteOne: async (filter: Record<string, unknown>) => {
        const idx = self.masterTenants.findIndex((t) =>
          matchesFilter(t as unknown as Record<string, unknown>, filter)
        );
        if (idx >= 0) {
          self.masterTenants.splice(idx, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };

    const getTenantDb = async (tenantId: string) => {
      const normalized = (tenantId || "default").toLowerCase().trim();
      self.getTenantStore(normalized);
      return {
        tenantId: normalized,
        readyState: 1,
        startSession: async () => new MockClientSession(),
        dropDatabase: async () => {
          self.tenantStores.delete(normalized);
          return true;
        },
        close: async () => undefined,
      };
    };

    const getTenantModels = (conn: { tenantId: string }) => {
      const store = self.getTenantStore(conn.tenantId);

      const InvoiceModel = {
        find: (filter: Record<string, unknown> = {}) => {
          let sortDir = -1;
          const run = () => {
            const matched = store.invoices.filter((inv) =>
              matchesFilter(inv as unknown as Record<string, unknown>, filter)
            );
            return [...matched].sort((a, b) => {
              const ta = a.createdAt ? a.createdAt.getTime() : 0;
              const tb = b.createdAt ? b.createdAt.getTime() : 0;
              return (ta - tb) * (sortDir === -1 ? -1 : 1);
            });
          };
          const chain = {
            sort: (spec: { createdAt?: number }) => {
              sortDir = spec.createdAt === 1 ? 1 : -1;
              return chain;
            },
            lean: async () => run().map((d) => ({ ...d })),
            then: (onFulfilled: (val: StoredInvoice[]) => unknown, onRejected?: (err: unknown) => unknown) =>
              Promise.resolve(run().map((d) => ({ ...d }))).then(onFulfilled, onRejected),
          };
          return chain;
        },
        findOne: (filter: Record<string, unknown>) => {
          const findMatch = () =>
            store.invoices.find((inv) => matchesFilter(inv as unknown as Record<string, unknown>, filter)) || null;
          const chain = {
            session: (_s: MockClientSession) => chain,
            lean: async () => {
              const found = findMatch();
              return found ? { ...found } : null;
            },
            then: (onFulfilled: (val: StoredInvoice | null) => unknown, onRejected?: (err: unknown) => unknown) =>
              Promise.resolve(findMatch()).then(onFulfilled, onRejected),
          };
          return chain;
        },
        countDocuments: (filter: Record<string, unknown> = {}) => {
          const count = () =>
            store.invoices.filter((inv) => matchesFilter(inv as unknown as Record<string, unknown>, filter)).length;
          const chain = {
            session: (_s: MockClientSession) => chain,
            then: (onFulfilled: (val: number) => unknown, onRejected?: (err: unknown) => unknown) =>
              Promise.resolve(count()).then(onFulfilled, onRejected),
          };
          return chain;
        },
        create: async (docs: Array<Partial<ITenantInvoice>>, opts?: { session?: MockClientSession }) => {
          const created = docs.map((d) => {
            const now = new Date();
            const doc: StoredInvoice = {
              _id: self.nextId("inv"),
              invoiceNumber: String(d.invoiceNumber || ""),
              idempotencyKey: String(d.idempotencyKey || ""),
              customerId: String(d.customerId || ""),
              customerName: d.customerName ?? null,
              customerEmail: String(d.customerEmail || ""),
              customerGstin: d.customerGstin ?? null,
              billingAddress: d.billingAddress ?? null,
              placeOfSupply: d.placeOfSupply ?? "West Bengal (19)",
              sellerState: d.sellerState ?? null,
              supplyType: d.supplyType ?? null,
              sacCode: d.sacCode ?? "998313",
              quantity: d.quantity ?? 1,
              unitPriceCents: d.unitPriceCents ?? null,
              amountCents: Number(d.amountCents ?? 0),
              currency: d.currency ?? "INR",
              isGstApplicable: d.isGstApplicable ?? true,
              gstRate: d.gstRate ?? 18,
              status: d.status ?? "COMMITTED",
              rollbackReason: d.rollbackReason ?? null,
              transactionId: String(d.transactionId || ""),
              description: String(d.description || ""),
              timestamp: String(d.timestamp || now.toISOString()),
              rsaSignature: d.rsaSignature ?? null,
              rsaFingerprint: d.rsaFingerprint ?? null,
              rsaPublicKeyPem: d.rsaPublicKeyPem ?? null,
              signedPayload: d.signedPayload ?? null,
              createdAt: now,
              updatedAt: now,
            };
            if (opts?.session) {
              opts.session.stage(() => {
                store.invoices.push(doc);
              });
            } else {
              store.invoices.push(doc);
            }
            return {
              ...doc,
              toObject: () => ({ ...doc }),
            };
          });
          return created;
        },
        deleteOne: (filter: Record<string, unknown>) => {
          let activeSession: MockClientSession | undefined;
          const runDelete = () => {
            const applyDelete = () => {
              const idx = store.invoices.findIndex((inv) =>
                matchesFilter(inv as unknown as Record<string, unknown>, filter)
              );
              if (idx >= 0) store.invoices.splice(idx, 1);
            };
            if (activeSession) {
              activeSession.stage(applyDelete);
              return { deletedCount: 1 };
            }
            const existed = store.invoices.some((inv) =>
              matchesFilter(inv as unknown as Record<string, unknown>, filter)
            );
            applyDelete();
            return { deletedCount: existed ? 1 : 0 };
          };
          const chain = {
            session: (s: MockClientSession) => {
              activeSession = s;
              return chain;
            },
            then: (
              onFulfilled: (val: { deletedCount: number }) => unknown,
              onRejected?: (err: unknown) => unknown
            ) => Promise.resolve(runDelete()).then(onFulfilled, onRejected),
          };
          return chain;
        },
        aggregate: async <T>(pipeline: Array<Record<string, unknown>>): Promise<T[]> => {
          const isFacet = pipeline.some((stage) => "$facet" in stage);
          if (!isFacet) {
            if (store.invoices.length === 0) return [];
            const revenueCents = store.invoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0);
            return [{ _id: null, count: store.invoices.length, revenueCents }] as unknown as T[];
          }

          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

          let totalRevenueCents = 0;
          let committedTransactions = 0;
          let rollbacksHandled = 0;
          let monthlyApiCallsUsed = 0;
          const customerMap = new Map<string, { invoicesCount: number; volumeCents: number }>();
          const slotMap = new Map<number, { requests: number; volumeCents: number }>();

          for (const inv of store.invoices) {
            const amt = inv.amountCents || 0;
            totalRevenueCents += amt;
            if (inv.status === "COMMITTED") committedTransactions++;
            if (inv.status === "ROLLED_BACK") rollbacksHandled++;

            const dt = inv.timestamp ? new Date(inv.timestamp) : inv.createdAt || now;
            if (dt >= startOfMonth && dt < startOfNextMonth) {
              monthlyApiCallsUsed++;
            }

            const email = inv.customerEmail || "anonymous@customer.io";
            const c = customerMap.get(email) || { invoicesCount: 0, volumeCents: 0 };
            c.invoicesCount += 1;
            c.volumeCents += amt;
            customerMap.set(email, c);

            const istMs = dt.getTime() + 330 * 60 * 1000;
            const istHour = new Date(istMs).getUTCHours();
            const slotIdx = Math.floor(istHour / 4);
            const s = slotMap.get(slotIdx) || { requests: 0, volumeCents: 0 };
            s.requests += 1;
            s.volumeCents += amt;
            slotMap.set(slotIdx, s);
          }

          const topCustomers = Array.from(customerMap.entries())
            .map(([email, v]) => ({ _id: email, ...v }))
            .sort((a, b) => b.volumeCents - a.volumeCents)
            .slice(0, 5);

          const hourlySlots = Array.from(slotMap.entries())
            .map(([slot, v]) => ({ _id: slot, ...v }))
            .sort((a, b) => a._id - b._id);

          return [
            {
              summary: [
                {
                  totalRevenueCents,
                  allTimeInvoicesCount: store.invoices.length,
                  committedTransactions,
                  rollbacksHandled,
                  monthlyApiCallsUsed,
                },
              ],
              hourlySlots,
              topCustomers,
            },
          ] as unknown as T[];
        },
      };

      const AuditLogModel = {
        findOne: (filter: Record<string, unknown>) => {
          const findMatch = () =>
            store.auditLogs.find((log) => matchesFilter(log as unknown as Record<string, unknown>, filter)) || null;
          const chain = {
            session: (_s: MockClientSession) => chain,
            lean: async () => {
              const found = findMatch();
              return found ? { ...found } : null;
            },
            then: (onFulfilled: (val: StoredAuditLog | null) => unknown, onRejected?: (err: unknown) => unknown) =>
              Promise.resolve(findMatch()).then(onFulfilled, onRejected),
          };
          return chain;
        },
        create: async (docs: Array<Partial<ITenantAuditLog>>, opts?: { session?: MockClientSession }) => {
          return docs.map((d) => {
            const now = new Date();
            const entry: StoredAuditLog = {
              _id: self.nextId("audit"),
              eventType: d.eventType || "INVOICE_COMMITTED",
              transactionId: String(d.transactionId || ""),
              invoiceNumber: d.invoiceNumber ?? null,
              idempotencyKey: d.idempotencyKey ?? null,
              actorEmail: d.actorEmail ?? null,
              status: String(d.status || "COMMITTED"),
              amountCents: Number(d.amountCents ?? 0),
              rsaSignature: d.rsaSignature ?? null,
              rsaFingerprint: d.rsaFingerprint ?? null,
              details: d.details ?? null,
              timestamp: String(d.timestamp || now.toISOString()),
              createdAt: now,
              updatedAt: now,
            };
            if (opts?.session) {
              opts.session.stage(() => {
                store.auditLogs.push(entry);
              });
            } else {
              store.auditLogs.push(entry);
            }
            return {
              ...entry,
              toObject: () => ({ ...entry }),
            };
          });
        },
      };

      return { InvoiceModel, AuditLogModel };
    };

    const masterConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: async () => ({ ok: 1 }),
        }),
      },
    };

    return {
      redis,
      masterConnection,
      TenantMasterModel,
      initMasterDb: async () => masterConnection,
      getTenantModels,
      getTenantDb,
      closeAndRemoveTenantDb: async (_tenantId: string) => undefined,
    };
  }
}

