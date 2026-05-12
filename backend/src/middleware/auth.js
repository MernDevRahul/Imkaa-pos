"use strict";

const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

/**
 * Verify JWT from HTTP-only cookie.
 * Attaches decoded payload to req.user
 */
function authenticate(req, res, next) {
  try {
    const token = req.cookies?.imkaaPos;

    if (!token) {
      return fail(res, "Authentication required", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return fail(res, "Session expired – please log in again", 401);
    }

    return fail(res, "Invalid token", 401);
  }
}

/**
 * Role-based authorization
 * Usage:
 * authorize('ADMIN')
 * authorize('ADMIN', 'MANAGER')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, "Authentication required", 401);
    }

    if (!roles.includes(req.user.role)) {
      return fail(res, "Insufficient permissions", 403);
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
