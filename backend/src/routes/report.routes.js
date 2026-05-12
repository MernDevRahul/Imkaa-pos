"use strict";

const router = require("express").Router();
const { prisma } = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { dateRangeRules } = require("../validators"); // ← centralized
const { ok } = require("../utils/response");

router.use(authenticate);

// ─── GET /api/v1/reports/summary?from=&to= ────────────────────────────────
router.get("/summary", dateRangeRules(), validate, async (req, res, next) => {
  try {
    const { from, to } = dateRange(req.query);

    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
      select: {
        grandTotal: true,
        taxTotal: true,
        discountTotal: true,
        paymentMode: true,
        createdAt: true,
        items: { select: { qty: true } },
      },
    });

    const totalRevenue = sum(sales, "grandTotal");
    const totalTax = sum(sales, "taxTotal");
    const totalDiscount = sum(sales, "discountTotal");
    const totalOrders = sales.length;
    const totalItems = sales
      .flatMap((s) => s.items)
      .reduce((a, i) => a + i.qty, 0);
    const avgOrderValue = totalOrders > 0 ? r2(totalRevenue / totalOrders) : 0;

    // By payment mode
    const byMode = {};
    for (const s of sales) {
      if (!byMode[s.paymentMode])
        byMode[s.paymentMode] = { count: 0, revenue: 0 };
      byMode[s.paymentMode].count++;
      byMode[s.paymentMode].revenue = r2(
        byMode[s.paymentMode].revenue + Number(s.grandTotal),
      );
    }

    // Daily breakdown (for chart)
    const daily = {};
    for (const s of sales) {
      const day = s.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { orders: 0, revenue: 0 };
      daily[day].orders++;
      daily[day].revenue = r2(daily[day].revenue + Number(s.grandTotal));
    }

    ok(res, {
      totalRevenue: r2(totalRevenue),
      totalTax: r2(totalTax),
      totalDiscount: r2(totalDiscount),
      totalOrders,
      totalItems,
      avgOrderValue,
      byPaymentMode: byMode,
      dailyBreakdown: Object.entries(daily).map(([date, v]) => ({
        date,
        ...v,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/reports/top-products?from=&to=&limit= ───────────────────
router.get(
  "/top-products",
  dateRangeRules(),
  validate,
  async (req, res, next) => {
    try {
      const { from, to } = dateRange(req.query);
      const limit = parseInt(req.query.limit) || 10;

      const items = await prisma.saleItem.findMany({
        where: {
          sale: { status: "COMPLETED", createdAt: { gte: from, lte: to } },
        },
        select: {
          productId: true,
          skuSnapshot: true,
          nameSnapshot: true,
          qty: true,
          lineTotal: true,
        },
      });

      const agg = {};
      for (const item of items) {
        if (!agg[item.productId]) {
          agg[item.productId] = {
            productId: item.productId,
            sku: item.skuSnapshot,
            name: item.nameSnapshot,
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        agg[item.productId].totalQty += item.qty;
        agg[item.productId].totalRevenue = r2(
          agg[item.productId].totalRevenue + Number(item.lineTotal),
        );
      }

      const top = Object.values(agg)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      ok(res, top);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/v1/reports/low-stock ───────────────────────────────────────
router.get("/low-stock", async (_req, res, next) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, sku, name, "stockQty", "lowStockThreshold",
             CASE WHEN "stockQty" = 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS alert
      FROM products
      WHERE "isActive" = true AND "stockQty" <= "lowStockThreshold"
      ORDER BY "stockQty" ASC
    `;
    ok(res, products);
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────
function dateRange({ from, to }) {
  const fromDate = from ? new Date(from) : startOfDay(new Date());
  const toDate = to
    ? new Date(new Date(to).setHours(23, 59, 59, 999))
    : endOfDay(new Date());
  return { from: fromDate, to: toDate };
}
function startOfDay(d) {
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(d) {
  d.setHours(23, 59, 59, 999);
  return d;
}
function sum(arr, key) {
  return arr.reduce((s, x) => s + Number(x[key] || 0), 0);
}
function r2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = router;
