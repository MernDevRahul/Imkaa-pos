'use strict';

const { validationResult } = require('express-validator');

/**
 * Reads express-validator errors and sends a 422 if any exist.
 * Place after your validation chain, before the controller.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };