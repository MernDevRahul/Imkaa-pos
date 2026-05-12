'use strict';

const { prisma }             = require('../utils/prisma');
const { calcLine, calcBill } = require('../utils/tax');

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE SEQUENCE — atomic increment inside a transaction
// ─────────────────────────────────────────────────────────────────────────────
async function allocateInvoiceNo(tx) {
  // Upsert ensures the row exists on first run
  await tx.invoiceSequence.upsert({
    where:  { id: 1 },
    create: { id: 1, nextSeq: 1 },
    update: {},
  });

  // Atomic increment
  const seq = await tx.invoiceSequence.update({
    where: { id: 1 },
    data:  { nextSeq: { increment: 1 } },
  });

  return `INV-${String(seq.nextSeq - 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SALE  (all writes in a single DB transaction)
// ─────────────────────────────────────────────────────────────────────────────
async function createSale({ items, billDiscount = 0, paymentMode, paidAmount, userId, customerPhone }) {
  return prisma.$transaction(async (tx) => {

    // ── 1. Validate & lock products ─────────────────────────────────────────
    const productIds = [...new Set(items.map(i => i.productId))];
    const products   = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product)          throw httpError(404, `Product not found: ${item.productId}`);
      if (!product.isActive) throw httpError(400, `Product is archived: ${product.name}`);
      if (product.stockQty < item.qty) {
        throw httpError(400, `Insufficient stock for "${product.name}". Available: ${product.stockQty}`);
      }
    }

    // ── 2. Calculate line totals ─────────────────────────────────────────────
    const lines = items.map(item => {
      const product = productMap[item.productId];
      const calc    = calcLine(
        Number(item.unitPrice),
        item.qty,
        Number(item.discount || 0),
        Number(product.gstRate)
      );
      return { ...item, product, ...calc };
    });

    // ── 3. Bill-level totals ─────────────────────────────────────────────────
    const bill = calcBill(lines, Number(billDiscount));

    if (Number(paidAmount) < bill.grandTotal) {
      throw httpError(400, `Paid amount (${paidAmount}) is less than grand total (${bill.grandTotal})`);
    }

    // ── 4. Allocate invoice number ───────────────────────────────────────────
    const invoiceNo = await allocateInvoiceNo(tx);

    // ── 5. Write Sale record ─────────────────────────────────────────────────
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        subTotal:        bill.subTotal,
        discountTotal:   bill.billDiscount,
        taxTotal:        bill.taxTotal,
        grandTotal:      bill.grandTotal,
        paymentMode,
        paidAmount:      Number(paidAmount),
        customerPhone,
        status:          'COMPLETED',
        createdByUserId: userId,

        // ── 6. Write SaleItems ───────────────────────────────────────────────
        items: {
          create: lines.map(l => ({
            productId:       l.productId,
            skuSnapshot:     l.product.sku,
            nameSnapshot:    l.product.name,
            qty:             l.qty,
            unitPrice:       Number(l.unitPrice),
            discount:        Number(l.discount || 0),
            gstRateSnapshot: Number(l.product.gstRate),
            taxAmount:       l.taxAmount,
            lineTotal:       l.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    // ── 7. Decrement stock + write StockMovements ────────────────────────────
    for (const l of lines) {
      const newQty = l.product.stockQty - l.qty;

      await tx.product.update({
        where: { id: l.productId },
        data:  { stockQty: newQty },
      });

      await tx.stockMovement.create({
        data: {
          productId:       l.productId,
          type:            'SALE',
          qtyDelta:        -l.qty,
          stockAfter:      newQty,
          referenceId:     sale.id,
          reason:          `Sale ${invoiceNo}`,
          createdByUserId: userId,
        },
      });
    }

    return sale;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST SALES
// ─────────────────────────────────────────────────────────────────────────────
async function listSales({ from, to, page = 1, limit = 50 }) {
  const where = { status: 'COMPLETED' };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        items:     true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (parseInt(page) - 1) * parseInt(limit),
      take:  parseInt(limit),
    }),
  ]);

  return { total, page: parseInt(page), limit: parseInt(limit), sales };
}

async function getSaleById(id) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      items:     true,
      createdBy: { select: { name: true } },
    },
  });
}

async function voidSale(id, userId) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) throw httpError(404, 'Sale not found');
    if (sale.status === 'VOID') throw httpError(400, 'Sale is already void');

    // Reverse stock
    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const newQty  = product.stockQty + item.qty;
      await tx.product.update({ where: { id: item.productId }, data: { stockQty: newQty } });
      await tx.stockMovement.create({
        data: {
          productId:       item.productId,
          type:            'ADJUSTMENT',
          qtyDelta:        item.qty,
          stockAfter:      newQty,
          referenceId:     id,
          reason:          `Void: ${sale.invoiceNo}`,
          createdByUserId: userId,
        },
      });
    }

    const voided = await tx.sale.update({
      where: { id },
      data:  { status: 'VOID' },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: { userId, action: 'SALE_VOID', entityId: id },
    });

    return voided;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { createSale, listSales, getSaleById, voidSale };