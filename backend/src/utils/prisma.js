'use strict';

const { Pool }         = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');

// ── Build adapter from DATABASE_URL ──────────────────────────────────────────
// Prisma v7's default engine type is "client", which requires an explicit
// database adapter instead of reading the URL from the environment itself.
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// ── Singleton – avoids creating a new connection pool on every hot-reload ────
const prisma = global.__prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = { prisma };