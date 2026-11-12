import { Router, Request, Response } from "express";
import { getTenantContext } from "../middleware/tenantContext.js";
import { jwtTenantAuthMiddleware } from "../middleware/jwtTenantAuth.js";
import { getTenantDb, getTenantModels, initMasterDb, TenantMasterModel } from "../config/db.js";
import { getSanitizedHost } from "../config/env.js";
import { getErrorMessage } from "../utils/errors.js";

interface FleetTenantAgg {
  _id: null;
  count: number;
  revenueCents: number;
}

interface AnalyticsSummaryAgg {
  totalRevenueCents: number;
  allTimeInvoicesCount: number;
  committedTransactions: number;
  rollbacksHandled: number;
  monthlyApiCallsUsed: number;
}

interface HourlySlotAgg {
  _id: number;
  requests: number;
  volumeCents: number;
}

interface TopCustomerAgg {
  _id: string | null;
  invoicesCount: number;
  volumeCents: number;
}

interface UsageFacetResult {
  summary: AnalyticsSummaryAgg[];
  hourlySlots: HourlySlotAgg[];
  topCustomers: TopCustomerAgg[];
}

export const analyticsRouter = Router();

// Platform / Super-Admin Cluster Fleet Endpoint: Aggregates total usage across all physical tenant databases
analyticsRouter.get("/fleet-cluster", async (_req: Request, res: Response) => {
  try {
    await initMasterDb();
    const tenants = await TenantMasterModel.find().lean();

    const perTenantResults = await Promise.all(
      tenants.map(async (t) => {
        try {
          const conn = await getTenantDb(t.tenantId);
          const { InvoiceModel } = getTenantModels(conn);
          const [agg] = await InvoiceModel.aggregate<FleetTenantAgg>([
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenueCents: { $sum: { $ifNull: ["$amountCents", 0] } },
              },
            },
          ]);

          const count = agg?.count || 0;
          const revenueCents = agg?.revenueCents || 0;

          return {
            count,
            revenueCents,
            breakdown: {
              tenantId: t.tenantId,
              name: t.name,
              tier: t.tier,
              databaseName: `ledgerguard_tenant_${t.tenantId}`,
              invoicesCount: count,
              storageKb: Math.max(16, count * 16),
              revenueRupees: (revenueCents / 100).toFixed(2),
            },
          };
        } catch (err: unknown) {
          console.error(`Error aggregating tenant ${t.tenantId}:`, getErrorMessage(err));
          return null;
        }
      })
    );

    let totalClusterInvoices = 0;
    let totalClusterRevenueCents = 0;
    const tenantBreakdowns = [];

    for (const item of perTenantResults) {
      if (!item) continue;
      totalClusterInvoices += item.count;
      totalClusterRevenueCents += item.revenueCents;
      tenantBreakdowns.push(item.breakdown);
    }

    const masterDbStorageKb = 32;
    const totalClusterStorageKb = tenantBreakdowns.reduce((sum, b) => sum + b.storageKb, masterDbStorageKb);
    const clusterCapacityMb = 512;
    const clusterCapacityKb = clusterCapacityMb * 1024;
    const clusterStorageUsedPercent = Math.min(100, (totalClusterStorageKb / clusterCapacityKb) * 100);

    return res.json({
      clusterHost: getSanitizedHost(process.env.MONGODB_BASE_URI, "mongodb-cluster"),
      region: "AWS ap-south-1 (Mumbai)",
      totalDatabases: tenants.length + 1,
      totalTenants: tenants.length,
      totalClusterInvoices,
      totalClusterRevenueRupees: (totalClusterRevenueCents / 100).toFixed(2),
      totalClusterStorageKb,
      clusterCapacityMb,
      clusterStorageUsedPercent: parseFloat(clusterStorageUsedPercent.toFixed(2)),
      tenantBreakdowns,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: "CLUSTER_FLEET_AGGREGATION_FAILED",
      message: getErrorMessage(err),
    });
  }
});

analyticsRouter.get("/usage", jwtTenantAuthMiddleware, async (_req: Request, res: Response) => {
  const ctx = getTenantContext();
  const tenantId = ctx.tenantId || "acme_corp";

  try {
    const tenantConn = await getTenantDb(tenantId);
    const { InvoiceModel } = getTenantModels(tenantConn);

    // Monthly Quota & Reset Logic (2,000 calls/month, 50MB storage, auto-resets on 1st of new month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

    const [facetResult] = await InvoiceModel.aggregate<UsageFacetResult>([
      {
        $addFields: {
          effectiveDate: {
            $ifNull: [
              {
                $dateFromString: {
                  dateString: "$timestamp",
                  onError: "$createdAt",
                  onNull: "$createdAt",
                },
              },
              { $ifNull: ["$createdAt", now] },
            ],
          },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalRevenueCents: { $sum: { $ifNull: ["$amountCents", 0] } },
                allTimeInvoicesCount: { $sum: 1 },
                committedTransactions: {
                  $sum: { $cond: [{ $eq: ["$status", "COMMITTED"] }, 1, 0] },
                },
                rollbacksHandled: {
                  $sum: { $cond: [{ $eq: ["$status", "ROLLED_BACK"] }, 1, 0] },
                },
                monthlyApiCallsUsed: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ["$effectiveDate", startOfMonth] },
                          { $lt: ["$effectiveDate", startOfNextMonth] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          hourlySlots: [
            {
              $project: {
                amountCents: { $ifNull: ["$amountCents", 0] },
                slotIndex: {
                  $floor: {
                    $divide: [
                      {
                        $hour: {
                          date: "$effectiveDate",
                          timezone: "Asia/Kolkata",
                        },
                      },
                      4,
                    ],
                  },
                },
              },
            },
            {
              $group: {
                _id: "$slotIndex",
                requests: { $sum: 1 },
                volumeCents: { $sum: "$amountCents" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          topCustomers: [
            {
              $group: {
                _id: { $ifNull: ["$customerEmail", "anonymous@customer.io"] },
                invoicesCount: { $sum: 1 },
                volumeCents: { $sum: { $ifNull: ["$amountCents", 0] } },
              },
            },
            { $sort: { volumeCents: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    const summary = facetResult?.summary?.[0] || {
      totalRevenueCents: 0,
      allTimeInvoicesCount: 0,
      committedTransactions: 0,
      rollbacksHandled: 0,
      monthlyApiCallsUsed: 0,
    };

    const totalRevenueCents: number = summary.totalRevenueCents || 0;
    const allTimeInvoicesCount: number = summary.allTimeInvoicesCount || 0;
    const committedCount: number = summary.committedTransactions || 0;
    const rollbacksCount: number = summary.rollbacksHandled || 0;
    const monthlyApiCallsUsed: number = summary.monthlyApiCallsUsed || 0;

    const monthlyApiLimit = 2000; // 2,000 API calls per month limit
    const monthlyStorageLimitMb = 50; // 50 MB database limit per workspace
    const monthlyStorageLimitKb = monthlyStorageLimitMb * 1024; // 51,200 KB

    const monthlyQuotaPercent = Math.min(100, parseFloat(((monthlyApiCallsUsed / monthlyApiLimit) * 100).toFixed(2)));

    // Storage used in this isolated tenant database
    const storageKbUsed = Math.max(16, allTimeInvoicesCount * 16);
    const storageUsedPercent = Math.min(100, parseFloat(((storageKbUsed / monthlyStorageLimitKb) * 100).toFixed(2)));

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilReset = Math.ceil((startOfNextMonth.getTime() - now.getTime()) / msPerDay);
    const currentMonthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const resetDateFormatted = startOfNextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Map aggregated 4-hour IST slots onto fixed 6-window timeline
    const slotLabels = ["12:00 AM", "04:00 AM", "08:00 AM", "12:00 PM", "04:00 PM", "08:00 PM"];
    const slotMap = new Map<number, { requests: number; volumeCents: number }>();
    for (const s of facetResult?.hourlySlots || []) {
      if (typeof s._id === "number") {
        slotMap.set(s._id, {
          requests: s.requests || 0,
          volumeCents: s.volumeCents || 0,
        });
      }
    }

    const hourlyTrend = slotLabels.map((label, idx) => {
      const slot = slotMap.get(idx);
      return {
        time: label,
        requests: slot?.requests || 0,
        volumeRupees: ((slot?.volumeCents || 0) / 100).toFixed(2),
      };
    });

    const topCustomers = (facetResult?.topCustomers || []).map((c: TopCustomerAgg) => ({
      email: c._id || "anonymous@customer.io",
      invoicesCount: c.invoicesCount || 0,
      volumeRupees: ((c.volumeCents || 0) / 100).toFixed(2),
    }));

    const averageOrderValueRupees =
      allTimeInvoicesCount > 0 ? (totalRevenueCents / allTimeInvoicesCount / 100).toFixed(2) : "0.00";

    return res.json({
      tenantId,
      databaseName: `ledgerguard_tenant_${tenantId}`,
      billingPeriod: currentMonthName,
      billingCycle: `${startOfMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(currentYear, currentMonth + 1, 0).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      daysUntilReset,
      resetDateFormatted,
      metrics: {
        totalRevenueCents,
        totalRevenueRupees: (totalRevenueCents / 100).toFixed(2),
        committedTransactions: committedCount,
        rollbacksHandled: rollbacksCount,
        apiCallCount: monthlyApiCallsUsed,
        allTimeInvoicesCount,
        averageOrderValueRupees,
        storageBytesUsed: storageKbUsed * 1024,
        storageKbUsed,
        quotaCapacityLimit: monthlyApiLimit, // 2000
        quotaLimitPercent: monthlyQuotaPercent,
        storageLimitMb: monthlyStorageLimitMb, // 50 MB
        storageLimitKb: monthlyStorageLimitKb, // 51200 KB
        storageUsedPercent,
      },
      hourlyTrend,
      topCustomers,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: "ANALYTICS_AGGREGATION_FAILED",
      message: getErrorMessage(err),
    });
  }
});
