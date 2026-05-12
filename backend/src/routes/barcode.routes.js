'use strict';

/**
 * Barcode Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Mount: app.use('/api/v1/barcodes', barcodeRoutes)
 *
 * Endpoints:
 *
 *   GET  /barcodes/:productId
 *        → SVG barcode for one product (by DB id)
 *        → Query: format=svg|html, moduleWidth=2, height=60
 *        → Roles: all authenticated
 *
 *   GET  /barcodes/sku/:sku
 *        → SVG barcode looked up by SKU string
 *        → Roles: all authenticated
 *
 *   GET  /barcodes/:productId/validate
 *        → Check SKU can be encoded; returns { valid, error? }
 *        → Roles: all authenticated
 *
 *   POST /barcodes/sheet
 *        → Printable HTML sheet for selected products + copies
 *        → Body: { products:[{productId, copies}], cols, moduleWidth, barHeight }
 *        → Roles: ADMIN, MANAGER
 *
 *   GET  /barcodes/sheet/all
 *        → Printable HTML sheet for ALL active products (1 copy each)
 *        → Query: cols, moduleWidth, barHeight
 *        → Roles: ADMIN, MANAGER
 */

const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl         = require('../controllers/barcode.controller');

// ── All barcode routes require login ──────────────────────────────────────────
router.use(authenticate);

// ── IMPORTANT: static paths must be registered BEFORE :productId param routes ─

// GET /barcodes/sheet/all  — all active products, 1 copy each
router.get('/sheet/all',
  authorize('ADMIN', 'MANAGER'),
  [
    query('cols').optional().isInt({ min: 1, max: 6 }).withMessage('cols must be 1–6'),
    query('moduleWidth').optional().isFloat({ min: 0.5, max: 5 }),
    query('barHeight').optional().isInt({ min: 20, max: 200 }),
  ],
  validate,
  ctrl.generateSheetAll
);

// GET /barcodes/sku/:sku  — lookup by SKU string
router.get('/sku/:sku',
  [
    param('sku').trim().notEmpty().withMessage('SKU is required'),
    query('moduleWidth').optional().isFloat({ min: 0.5, max: 5 }),
    query('height').optional().isInt({ min: 20, max: 300 }),
  ],
  validate,
  ctrl.generateBySku
);

// POST /barcodes/sheet  — custom sheet (selected products + copies)
router.post('/sheet',
  authorize('ADMIN', 'MANAGER'),
  [
    body('products')
      .isArray({ min: 1 }).withMessage('products must be a non-empty array'),
    body('products.*.productId')
      .notEmpty().withMessage('Each entry must have a productId'),
    body('products.*.copies')
      .optional().isInt({ min: 1, max: 100 }).withMessage('copies must be 1–100'),
    body('cols')
      .optional().isInt({ min: 1, max: 6 }).withMessage('cols must be 1–6'),
    body('moduleWidth')
      .optional().isFloat({ min: 0.5, max: 5 }),
    body('barHeight')
      .optional().isInt({ min: 20, max: 200 }),
  ],
  validate,
  ctrl.generateSheet
);

// GET /barcodes/:productId/validate  — must come before /:productId
router.get('/:productId/validate',
  param('productId').notEmpty(),
  validate,
  ctrl.validateBarcode
);

// GET /barcodes/:productId  — single product barcode (by DB id)
router.get('/:productId',
  [
    param('productId').notEmpty().withMessage('productId is required'),
    query('format').optional().isIn(['svg', 'html']).withMessage('format must be svg or html'),
    query('moduleWidth').optional().isFloat({ min: 0.5, max: 5 }),
    query('height').optional().isInt({ min: 20, max: 300 }),
  ],
  validate,
  ctrl.generateOne
);

module.exports = router;