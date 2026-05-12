'use strict';

const { Prisma } = require('@prisma/client');

/**
 * Centralised Express error handler.
 * Translates Prisma errors, validation errors, and generic JS errors
 * into consistent API responses.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // ── Prisma unique constraint violation ────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.status(400).json({ success: false, message: `Database error: ${err.code}` });
  }

  // ── Prisma validation error ────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ success: false, message: 'Invalid data provided' });
  }

  // ── Generic HTTP errors ────────────────────────────────────────────────────
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };