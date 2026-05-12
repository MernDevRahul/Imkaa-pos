'use strict';

const router = require('express').Router();
const { authenticate, authorize }  = require('../middleware/auth');
const { validate }                 = require('../middleware/validate');
const { saleCreateRules }          = require('../validators');  // ← centralized
const ctrl = require('../controllers/sales.controller');

router.use(authenticate);

// GET  /api/v1/sales?from=&to=&page=&limit=
router.get('/', ctrl.list);

// GET  /api/v1/sales/:id   (reprint)
router.get('/:id', ctrl.get);

// GET  /api/v1/sales/:id/pdf
router.get('/:id/pdf', ctrl.getPDF);

// POST /api/v1/sales  – create & complete a sale (atomic transaction)
router.post(
  '/',
  saleCreateRules(),   // ← centralized validator
  validate,
  ctrl.create
);

// POST /api/v1/sales/:id/void  (admin only)
router.post('/:id/void', authorize('ADMIN'), ctrl.voidSale);

module.exports = router;