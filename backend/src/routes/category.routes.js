'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const { validate }   = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { prisma }     = require('../utils/prisma');
const categoryController = require('../controllers/category.controller');
const { ok, created, fail } = require('../utils/response');

router.use(authenticate);

// GET /api/v1/categories
router.get('/', categoryController.get);

// POST /api/v1/categories  (admin/manager)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  categoryController.create
);

// DELETE /api/v1/categories/:id  (admin only)
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    // Only delete if no products are linked
    const count = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (count > 0) return fail(res, `Cannot delete: ${count} product(s) use this category`, 409);
    await prisma.category.delete({ where: { id: req.params.id } });
    ok(res, null, 'Category deleted');
  } catch (err) { next(err); }
});

module.exports = router;