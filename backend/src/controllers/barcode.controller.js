'use strict';

/**
 * Barcode Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   generateOne      — single product barcode (SVG response)
 *   generateBySku    — single barcode looked up by SKU
 *   generateSheet    — multi-product printable HTML sheet
 *   validateBarcode  — check a SKU is Code128B-encodable
 */

const barcodeService  = require('../services/barcode.service');
const productService  = require('../services/product.service');
const { prisma }      = require('../utils/prisma');
const { ok, fail }    = require('../utils/response');

// ─── GET /api/v1/barcodes/:productId ─────────────────────────────────────────
// Returns Code128B SVG for a single product.
// Query params:
//   format     svg (default) | html (label card with price)
//   moduleWidth  bar pixel width (default 2)
//   height       bar height in px (default 60)
async function generateOne(req, res, next) {
  try {
    const product = await productService.getById(req.params.productId);
    if (!product)         return fail(res, 'Product not found', 404);
    if (!product.isActive) return fail(res, 'Product is archived', 400);

    const { moduleWidth = 2, height = 60, format = 'svg' } = req.query;

    const svg = barcodeService.generateBarcodeSVG(
      product.sku,
      product.name,
      {
        moduleWidth: parseFloat(moduleWidth),
        height: parseInt(height),
        price: product.sellingPrice ? `₹${parseFloat(product.sellingPrice).toFixed(2)}` : ''
      }
    );

    if (format === 'html') {
      // Return a self-contained HTML card (easy to iframe in frontend)
      return res.status(200).type('html').send(_wrapHtml(svg));
    }

    // Default: raw SVG
    res.status(200)
      .type('image/svg+xml')
      .set('Content-Disposition', `inline; filename="${product.sku}.svg"`)
      .send(svg);
  } catch (err) { next(err); }
}

// ─── GET /api/v1/barcodes/sku/:sku ───────────────────────────────────────────
// Resolve by SKU then return barcode — useful for reprint by scanner.
async function generateBySku(req, res, next) {
  try {
    const product = await productService.getBySku(req.params.sku);
    if (!product)          return fail(res, `No product found for SKU: ${req.params.sku}`, 404);
    if (!product.isActive) return fail(res, 'Product is archived', 400);

    const { moduleWidth = 2, height = 60 } = req.query;

    const svg = barcodeService.generateBarcodeSVG(
      product.sku,
      product.name,
      {
        moduleWidth: parseFloat(moduleWidth),
        height: parseInt(height),
        price: product.sellingPrice ? `₹${parseFloat(product.sellingPrice).toFixed(2)}` : ''
      }
    );

    res.status(200)
      .type('image/svg+xml')
      .set('Content-Disposition', `inline; filename="${product.sku}.svg"`)
      .send(svg);
  } catch (err) { next(err); }
}

// ─── POST /api/v1/barcodes/sheet ─────────────────────────────────────────────
// Generate a printable A4 label sheet for one or many products.
//
// Request body:
// {
//   "products": [
//     { "productId": "clx...", "copies": 3 },
//     { "productId": "cly...", "copies": 1 }
//   ],
//   "cols": 3,          // labels per row (optional, default 3)
//   "moduleWidth": 1.5, // optional
//   "barHeight": 50     // optional
// }
//
// Returns: text/html — open in new tab and hit print.
// Add ?autoprint=1 to URL to trigger browser print dialog automatically.
async function generateSheet(req, res, next) {
  try {
    const { products: requested = [], cols, moduleWidth, barHeight } = req.body;

    if (!Array.isArray(requested) || requested.length === 0) {
      return fail(res, 'products array is required and must not be empty');
    }
    if (requested.length > 50) {
      return fail(res, 'Maximum 50 products per sheet request');
    }

    // Fetch all products in one query
    const ids = requested.map(r => r.productId).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, sku: true, name: true, sellingPrice: true, isActive: true },
    });
    const dbMap = Object.fromEntries(dbProducts.map(p => [p.id, p]));

    // Build sheet input, report any missing
    const missing = [];
    const sheetProducts = [];

    for (const r of requested) {
      const p = dbMap[r.productId];
      if (!p) { missing.push(r.productId); continue; }
      if (!p.isActive) { missing.push(`${p.sku} (archived)`); continue; }

      sheetProducts.push({
        sku:          p.sku,
        name:         p.name,
        sellingPrice: p.sellingPrice,
        copies:       Math.min(parseInt(r.copies) || 1, 100),
      });
    }

    if (sheetProducts.length === 0) {
      return fail(res, `No valid products found. Issues: ${missing.join(', ')}`);
    }

    const html = barcodeService.generateBarcodeSheet(sheetProducts, {
      cols:        parseInt(cols)       || 3,
      moduleWidth: parseFloat(moduleWidth) || 1.5,
      barHeight:   parseInt(barHeight)  || 50,
    });

    // Warn about partial failures in response header
    if (missing.length > 0) {
      res.set('X-Missing-Products', missing.join(','));
    }

    res.status(200).type('html').send(html);
  } catch (err) { next(err); }
}

// ─── GET /api/v1/barcodes/sheet/all ─────────────────────────────────────────
// Convenience: sheet for ALL active products (1 copy each).
// Useful for initial store setup.
async function generateSheetAll(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where:   { isActive: true },
      select:  { sku: true, name: true, sellingPrice: true },
      orderBy: { sku: 'asc' },
    });

    if (products.length === 0) return fail(res, 'No active products found', 404);

    const html = barcodeService.generateBarcodeSheet(
      products.map(p => ({ ...p, copies: 1 })),
      {
        cols:        parseInt(req.query.cols)        || 3,
        moduleWidth: parseFloat(req.query.moduleWidth) || 1.5,
        barHeight:   parseInt(req.query.barHeight)   || 50,
      }
    );

    res.status(200).type('html').send(html);
  } catch (err) { next(err); }
}

// ─── GET /api/v1/barcodes/:productId/validate ────────────────────────────────
// Checks whether a product's SKU can be encoded without errors.
async function validateBarcode(req, res, next) {
  try {
    const product = await productService.getById(req.params.productId);
    if (!product) return fail(res, 'Product not found', 404);

    const result = barcodeService.validateSku(product.sku);
    ok(res, {
      productId:  product.id,
      sku:        product.sku,
      name:       product.name,
      ...result,
      barcodeUrl: `/api/v1/barcodes/${product.id}`,
    });
  } catch (err) { next(err); }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function _wrapHtml(svg) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
  .card { border: 1px dashed #ccc; padding: 16px; text-align: center; }
</style>
</head><body>
<div class="card">
  ${svg}
</div>
</body></html>`;
}

module.exports = {
  generateOne,
  generateBySku,
  generateSheet,
  generateSheetAll,
  validateBarcode,
};