import { tenantDbManager } from "../config/tenantDbManager.js";

export interface MonthlyUsageSummary {
  tenantId: string;
  totalInvoicedCents: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  rolledBackCount: number;
  averageInvoiceValueCents: number;
  currency: string;
}

export class UsageAggregationService {
  /**
   * Executes high-performance MongoDB aggregation pipeline inside the tenant's isolated database.
   * Returns financial rollups without exposing records from other tenants.
   */
  public static async getTenantBillingSummary(tenantId: string): Promise<MonthlyUsageSummary> {
    const tenantContext = await tenantDbManager.getTenantConnection(tenantId);
    const Invoice = tenantContext.models.Invoice;

    const aggregationPipeline = [
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmountCents: { $sum: "$totalCents" },
        },
      },
    ];

    const results = await Invoice.aggregate(aggregationPipeline);

    let totalInvoicedCents = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let rolledBackCount = 0;
    let totalInvoices = 0;

    for (const group of results) {
      totalInvoicedCents += group.totalAmountCents;
      totalInvoices += group.count;

      if (group._id === "PAID") {
        paidInvoicesCount = group.count;
      } else if (group._id === "PENDING") {
        pendingInvoicesCount = group.count;
      } else if (group._id === "ROLLED_BACK") {
        rolledBackCount = group.count;
      }
    }

    const averageInvoiceValueCents =
      totalInvoices > 0 ? Math.round(totalInvoicedCents / totalInvoices) : 0;

    return {
      tenantId,
      totalInvoicedCents,
      paidInvoicesCount,
      pendingInvoicesCount,
      rolledBackCount,
      averageInvoiceValueCents,
      currency: "INR",
    };
  }

  /**
   * Aggregation pipeline to track hourly transaction volume for real-time charting
   */
  public static async getHourlyTransactionStats(tenantId: string, hours: number = 24) {
    const tenantContext = await tenantDbManager.getTenantConnection(tenantId);
    const Invoice = tenantContext.models.Invoice;

    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await Invoice.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: {
            hour: { $hour: "$createdAt" },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
          volumeCents: { $sum: "$totalCents" },
        },
      },
      { $sort: { "_id.date": 1, "_id.hour": 1 } },
    ]);

    return stats;
  }
}
