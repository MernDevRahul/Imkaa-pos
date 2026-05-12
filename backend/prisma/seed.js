'use strict';

/**
 * Run: node prisma/seed.js
 * Or:  npm run db:seed
 *
 * Seeds: admin user, cashier user, categories, products, invoice sequence
 */

require('dotenv').config();
const { Pool }         = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const bcrypt           = require('bcryptjs');

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log('🌱  Seeding database...\n');

  // ── 1. Users ─────────────────────────────────────────────────────────────
  const adminHash   = await bcrypt.hash('admin123', 12);
  const cashierHash = await bcrypt.hash('cashier123', 12);

  const admin = await prisma.user.upsert({
    where:  { username: 'admin' },
    create: { username: 'admin', name: 'Store Admin', passwordHash: adminHash, role: 'ADMIN' },
    update: { passwordHash: adminHash },
  });

  const cashier = await prisma.user.upsert({
    where:  { username: 'cashier1' },
    create: { username: 'cashier1', name: 'Raj Kumar', passwordHash: cashierHash, role: 'CASHIER' },
    update: { passwordHash: cashierHash },
  });

  console.log(`✅  Users: admin (admin123), cashier1 (cashier123)`);

  // ── 2. Invoice sequence ───────────────────────────────────────────────────
  await prisma.invoiceSequence.upsert({
    where:  { id: 1 },
    create: { id: 1, nextSeq: 1 },
    update: {},
  });

  // ── 3. Categories ─────────────────────────────────────────────────────────
  const categories = await Promise.all(
    ['Beverages', 'Snacks', 'Dairy', 'Staples', 'Household', 'Personal Care']
      .map(name => prisma.category.upsert({
        where:  { name },
        create: { name },
        update: {},
      }))
  );
  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));
  console.log(`✅  Categories: ${categories.map(c => c.name).join(', ')}`);

  // ── 4. Products ───────────────────────────────────────────────────────────
  const products = [
    // Beverages
    { sku:'BEV001', name:'Mineral Water 1L',       cat:'Beverages',     cost:8,   sell:15,  gst:0,  stock:120, threshold:20 },
    { sku:'BEV002', name:'Mango Juice 200ml',       cat:'Beverages',     cost:12,  sell:20,  gst:12, stock:80,  threshold:15 },
    { sku:'BEV003', name:'Cold Drink 600ml',        cat:'Beverages',     cost:28,  sell:45,  gst:28, stock:60,  threshold:12 },
    { sku:'BEV004', name:'Coconut Water 330ml',     cat:'Beverages',     cost:20,  sell:35,  gst:0,  stock:40,  threshold:10 },
    // Snacks
    { sku:'SNK001', name:'Potato Chips 100g',       cat:'Snacks',        cost:15,  sell:25,  gst:12, stock:60,  threshold:10 },
    { sku:'SNK002', name:'Biscuits Marie 200g',     cat:'Snacks',        cost:18,  sell:28,  gst:18, stock:45,  threshold:10 },
    { sku:'SNK003', name:'Namkeen Mix 200g',        cat:'Snacks',        cost:30,  sell:48,  gst:12, stock:35,  threshold:8  },
    { sku:'SNK004', name:'Chocolate Bar 50g',       cat:'Snacks',        cost:22,  sell:35,  gst:18, stock:50,  threshold:10 },
    // Dairy
    { sku:'DAI001', name:'Full Cream Milk 1L',      cat:'Dairy',         cost:55,  sell:68,  gst:0,  stock:8,   threshold:10 },
    { sku:'DAI002', name:'Toned Milk 500ml',        cat:'Dairy',         cost:27,  sell:35,  gst:0,  stock:15,  threshold:8  },
    { sku:'DAI003', name:'Paneer 200g',             cat:'Dairy',         cost:70,  sell:95,  gst:5,  stock:3,   threshold:5  },
    { sku:'DAI004', name:'Curd 500g',               cat:'Dairy',         cost:45,  sell:60,  gst:5,  stock:20,  threshold:6  },
    { sku:'DAI005', name:'Butter Salted 100g',      cat:'Dairy',         cost:55,  sell:72,  gst:12, stock:12,  threshold:5  },
    // Staples
    { sku:'STA001', name:'Basmati Rice 1kg',        cat:'Staples',       cost:85,  sell:110, gst:5,  stock:200, threshold:30 },
    { sku:'STA002', name:'Toor Dal 500g',           cat:'Staples',       cost:65,  sell:88,  gst:0,  stock:150, threshold:25 },
    { sku:'STA003', name:'Wheat Atta 1kg',          cat:'Staples',       cost:42,  sell:58,  gst:0,  stock:180, threshold:30 },
    { sku:'STA004', name:'Refined Oil 1L',          cat:'Staples',       cost:110, sell:145, gst:5,  stock:80,  threshold:15 },
    { sku:'STA005', name:'Sugar 1kg',               cat:'Staples',       cost:38,  sell:52,  gst:0,  stock:100, threshold:20 },
    { sku:'STA006', name:'Salt Iodized 1kg',        cat:'Staples',       cost:15,  sell:22,  gst:0,  stock:90,  threshold:15 },
    // Household
    { sku:'HOU001', name:'Dish Wash Bar 150g',      cat:'Household',     cost:12,  sell:20,  gst:18, stock:40,  threshold:8  },
    { sku:'HOU002', name:'Floor Cleaner 500ml',     cat:'Household',     cost:55,  sell:82,  gst:18, stock:25,  threshold:5  },
    { sku:'HOU003', name:'Laundry Detergent 500g',  cat:'Household',     cost:60,  sell:88,  gst:18, stock:30,  threshold:8  },
    // Personal Care
    { sku:'PRC001', name:'Toothpaste 100g',         cat:'Personal Care', cost:40,  sell:62,  gst:18, stock:35,  threshold:8  },
    { sku:'PRC002', name:'Bathing Soap 100g',       cat:'Personal Care', cost:22,  sell:35,  gst:18, stock:50,  threshold:10 },
  ];

  let created = 0;
  for (const p of products) {
    await prisma.product.upsert({
      where:  { sku: p.sku },
      create: {
        sku: p.sku, name: p.name,
        categoryId:        catMap[p.cat],
        costPrice:         p.cost,
        sellingPrice:      p.sell,
        gstRate:           p.gst,
        stockQty:          p.stock,
        lowStockThreshold: p.threshold,
      },
      update: { sellingPrice: p.sell, stockQty: p.stock },
    });
    created++;
  }
  console.log(`✅  Products: ${created} upserted`);

  console.log('\n🎉  Seed complete!\n');
  console.log('  Login credentials:');
  console.log('    Admin:   admin / admin123');
  console.log('    Cashier: cashier1 / cashier123\n');
}

main()
  .catch(e => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());