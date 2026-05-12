'use strict';

const { prisma }   = require('../utils/prisma');
const { ok, fail } = require('../utils/response');

// ── SERVICE ──────────────────────────────────────────────────────────────────

async function overview() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true, sku: true, name: true,
      stockQty: true, lowStockThreshold: true,
      category: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async function lowStock() {
  // Raw query to compare stockQty with lowStockThreshold (both columns)
  const products = await prisma.$queryRaw`
    SELECT id, sku, name, "stockQty", "lowStockThreshold"
    FROM products
    WHERE "isActive" = true AND "stockQty" <= "lowStockThreshold"
    ORDER BY "stockQty" ASC
  `;
  return products;
}

async function getMovements({ productId, limit = 50 }) {
  return prisma.stockMovement.findMany({
    where: productId ? { productId } : undefined,
    include: {
      product:   { select: { sku: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });
}

async function adjust(productId, qtyDelta, reason, userId) {
  return prisma.$transaction(async (tx) => {
    // Lock the row and check it exists
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
    if (!product.isActive) throw Object.assign(new Error('Cannot adjust archived product'), { status: 400 });

    const newQty = product.stockQty + qtyDelta;
    if (newQty < 0) throw Object.assign(new Error(`Insufficient stock. Current: ${product.stockQty}`), { status: 400 });

    // Update stock
    const updated = await tx.product.update({
      where: { id: productId },
      data:  { stockQty: newQty },
    });

    // Write movement log
    await tx.stockMovement.create({
      data: {
        productId,
        type:           'ADJUSTMENT',
        qtyDelta,
        stockAfter:     newQty,
        reason,
        createdByUserId: userId,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action:   'STOCK_ADJUST',
        entityId: productId,
        meta:     { qtyDelta, reason, stockBefore: product.stockQty, stockAfter: newQty },
      },
    });

    return updated;
  });
}

// ── CONTROLLER ────────────────────────────────────────────────────────────────

exports.overview = async (_req, res, next) => {
  try { ok(res, await overview()); } catch (err) { next(err); }
};

exports.lowStock = async (_req, res, next) => {
  try { ok(res, await lowStock()); } catch (err) { next(err); }
};

exports.movements = async (req, res, next) => {
  try { ok(res, await getMovements(req.query)); } catch (err) { next(err); }
};

exports.adjust = async (req, res, next) => {
  try {
    const { productId, qtyDelta, reason } = req.body;
    const product = await adjust(productId, parseInt(qtyDelta), reason, req.user.id);
    ok(res, product, 'Stock adjusted successfully');
  } catch (err) { next(err); }
};