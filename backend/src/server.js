'use strict';

require('dotenv').config();
const app = require('./app');
const { prisma } = require('./utils/prisma');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('✅  Database connected');

    app.listen(PORT, () => {
      console.log(`🚀  POS API running on http://localhost:${PORT}`);
      console.log(`    Environment : ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑  Server stopped');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();