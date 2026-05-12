'use strict';

const salesService          = require('../services/sales.service');
const pdfService            = require('../services/pdf.service');
const { ok, created, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const result = await salesService.listSales(req.query);
    ok(res, result);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) return fail(res, 'Sale not found', 404);
    ok(res, sale);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const sale = await salesService.createSale({
      ...req.body,
      userId: req.user.id,
    });
    created(res, sale, `Sale created — ${sale.invoiceNo}`);
  } catch (err) { next(err); }
}

async function voidSale(req, res, next) {
  try {
    const sale = await salesService.voidSale(req.params.id, req.user.id);
    ok(res, sale, 'Sale voided and stock reversed');
  } catch (err) { next(err); }
}

async function getPDF(req, res, next) {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    if (!sale) return fail(res, 'Sale not found', 404);

    // Store details can be passed via query for flexibility (v1)
    const storeDetails = {
      storeName:   req.query.storeName,
      address:     req.query.address,
      phone:       req.query.phone,
      invoiceNote: req.query.invoiceNote,
    };

    const pdfBuffer = await pdfService.generateInvoicePDF(sale, storeDetails);

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${sale.invoiceNo}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) { next(err); }
}

module.exports = { list, get, create, voidSale, getPDF };