'use strict';

const router = require('express').Router();
const { param } = require('express-validator');
const { authenticate, authorize }                = require('../middleware/auth');
const { validate }                               = require('../middleware/validate');
const { productCreateRules, productUpdateRules } = require('../validators');
const ctrl = require('../controllers/product.controller');

// All product routes require authentication
router.use(authenticate);

// GET  /api/v1/products?search=&categoryId=&active=
router.get('/', ctrl.list);

// GET  /api/v1/products/resolve/:sku  ← fast barcode lookup (cashier OK)
router.get(
  '/resolve/:sku',
  param('sku').trim().notEmpty().withMessage('SKU is required'),
  validate,
  ctrl.resolveSku
);

// GET  /api/v1/products/:id
router.get('/:id', ctrl.get);

// POST /api/v1/products  (admin/manager only)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  productCreateRules(),   // ← centralized validator
  validate,
  ctrl.create
);

// PATCH /api/v1/products/:id  (admin/manager only)
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  productUpdateRules(),   // ← centralized validator
  validate,
  ctrl.update
);

// POST /api/v1/products/:id/archive  (admin only)
router.post('/:id/archive', authorize('ADMIN'), ctrl.archive);
router.patch('/:id/activate', authorize('ADMIN'), ctrl.activate);

module.exports = router;