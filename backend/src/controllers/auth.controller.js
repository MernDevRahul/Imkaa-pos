'use strict';

const authService  = require('../services/auth.service');
const { ok, fail } = require('../utils/response');

async function login(req, res, next) {
  try {
    const result = await authService.login(req,res);
    if (!result) return fail(res, 'Invalid username or password', 401);
    ok(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req,res);
    ok(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    if (!user) return fail(res, 'User not found', 404);
    ok(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me };