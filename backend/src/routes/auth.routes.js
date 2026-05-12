'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const { validate }       = require('../middleware/validate');
const { authenticate }   = require('../middleware/auth');
const authController     = require('../controllers/auth.controller');

// POST /api/v1/auth/login
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// POST /api/v1/auth/logout  (client just discards token; server logs the action)
router.post('/logout', authenticate, authController.logout);

// GET  /api/v1/auth/me
router.get('/me', authenticate, authController.me);

module.exports = router;