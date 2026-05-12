'use strict';

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 * @param {number} [statusCode=200]
 */
const ok = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

/**
 * Send a created (201) response.
 */
const created = (res, data, message = 'Created') => ok(res, data, message, 201);

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {*} [errors]
 */
const fail = (res, message, statusCode = 400, errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });

module.exports = { ok, created, fail };