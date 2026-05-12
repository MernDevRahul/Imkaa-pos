'use strict';

const productService   = require('../services/product.service');
const { ok, created, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const products = await productService.list(req.query);
    ok(res, products);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) return fail(res, 'Product not found', 404);
    ok(res, product);
  } catch (err) { next(err); }
}

async function resolveSku(req, res, next) {
  try {
    const product = await productService.getBySku(req.params.sku);
    if (!product || !product.isActive) return fail(res, 'Product not found for this SKU', 404);
    ok(res, product);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const product = await productService.create(req.body);
    created(res, product, 'Product created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const product = await productService.update(req.params.id, req.body);
    ok(res, product, 'Product updated');
  } catch (err) { next(err); }
}

async function archive(req, res, next) {
  try {
    const product = await productService.archive(req.params.id);
    ok(res, product, 'Product archived');
  } catch (err) { next(err); }
}

async function activate(req, res, next) {
  try {
    const product = await productService.activate(req.params.id);
    ok(res, product, 'Product activated');
  } catch (err) { next(err); }
}

module.exports = { list, get, resolveSku, create, update, archive, activate };