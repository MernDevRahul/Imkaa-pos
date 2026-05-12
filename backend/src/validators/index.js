'use strict';

const { body, query } = require('express-validator');

// ── Product validators ────────────────────────────────────────────────────────

const productCreateRules = () => [
  body('sku')
    .trim().notEmpty().withMessage('SKU is required')
    .toUpperCase()
    .matches(/^[A-Z0-9_-]+$/).withMessage('SKU can only contain letters, numbers, hyphens and underscores'),
  body('name')
    .trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 120 }).withMessage('Name must be 120 characters or less'),
  body('sellingPrice')
    .isFloat({ min: 0.01 }).withMessage('Selling price must be greater than 0'),
  body('costPrice')
    .optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('gstRate')
    .optional().isIn([0, 5, 12, 18, 28]).withMessage('GST must be 0, 5, 12, 18, or 28'),
  body('stockQty')
    .optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold')
    .optional().isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer'),
];

const productUpdateRules = () => [
  body('name')
    .optional().trim().notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 120 }),
  body('sellingPrice')
    .optional().isFloat({ min: 0.01 }).withMessage('Selling price must be > 0'),
  body('costPrice')
    .optional().isFloat({ min: 0 }),
  body('gstRate')
    .optional().isIn([0, 5, 12, 18, 28]),
  body('lowStockThreshold')
    .optional().isInt({ min: 0 }),
];

// ── Sale validators ───────────────────────────────────────────────────────────

const saleCreateRules = () => [
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId')
    .notEmpty().withMessage('Each item must have a productId'),
  body('items.*.qty')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.discount')
    .optional().isFloat({ min: 0 }).withMessage('Line discount must be ≥ 0'),
  body('billDiscount')
    .optional().isFloat({ min: 0 }).withMessage('Bill discount must be ≥ 0'),
  body('paymentMode')
    .isIn(['CASH', 'UPI', 'CARD']).withMessage('paymentMode must be CASH, UPI, or CARD'),
  body('paidAmount')
    .isFloat({ min: 0 }).withMessage('paidAmount is required and must be positive'),
  body('customerPhone')
    .optional().trim().isLength({ max: 20 }).withMessage('Phone number is too long'),
];

// ── Inventory validators ──────────────────────────────────────────────────────

const stockAdjustRules = () => [
  body('productId').notEmpty().withMessage('productId is required'),
  body('qtyDelta')
    .isInt().withMessage('qtyDelta must be an integer')
    .custom(v => v !== 0).withMessage('qtyDelta cannot be 0'),
  body('reason')
    .trim().notEmpty().withMessage('Reason is required')
    .isLength({ max: 200 }).withMessage('Reason must be 200 chars or less'),
];

// ── Query validators ──────────────────────────────────────────────────────────

const dateRangeRules = () => [
  query('from').optional().isISO8601().withMessage('from must be a valid date (YYYY-MM-DD)'),
  query('to').optional().isISO8601().withMessage('to must be a valid date (YYYY-MM-DD)'),
];

module.exports = {
  productCreateRules,
  productUpdateRules,
  saleCreateRules,
  stockAdjustRules,
  dateRangeRules,
};