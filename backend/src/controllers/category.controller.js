"use strict";

const categoryService = require('../services/category.service');
const { ok, fail } = require('../utils/response');

async function get(req,res,next){
    try {
        const result = await categoryService.get(req,res);
        if(!result) return fail(res, 'Category not found');
        ok(res, result, 'Category found Successfully')
    } catch (err) {
        next(err);
    }
}

async function create(req,res,next){
    try {
        const result = await categoryService.create(req,res);
        if(!result) return fail(res, 'Category not Created');
        ok(res, result, 'Category Created Successfully')
    } catch (err) {
        next(err);
    }
}

module.exports = { get, create };