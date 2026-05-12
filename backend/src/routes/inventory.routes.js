'use strict';

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate }                = require('../middleware/validate');
const { stockAdjustRules }        = require('../validators');  // ← centralized
const ctrl = require('../controllers/inventory.controller');

router.use(authenticate);

// GET /api/v1/inventory                – stock overview for all active products
router.get('/', ctrl.overview);

// GET /api/v1/inventory/low-stock      – products below threshold
router.get('/low-stock', ctrl.lowStock);

// GET /api/v1/inventory/movements      – movement log (with optional productId filter)
router.get('/movements', ctrl.movements);

// POST /api/v1/inventory/adjust        – admin-only stock adjustment
router.post(
  '/adjust',
  authorize('ADMIN', 'MANAGER'),
  stockAdjustRules(),   // ← centralized validator
  validate,
  ctrl.adjust
);

module.exports = router;