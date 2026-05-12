"use strict"

const { prisma } = require("../utils/prisma");

async function get(req,res){
    const response = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return response;
}

async function create(req,res){
    const { name } = req.body;
    const response = await prisma.category.create( { data: {name: name } });
    return response;
}

module.exports = { get, create };