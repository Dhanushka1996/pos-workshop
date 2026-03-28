import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where:  { email: 'admin@posworkshop.com' },
    update: {},
    create: { email: 'admin@posworkshop.com', password: hash, full_name: 'System Admin', role: 'admin', is_active: true },
  });

  // ── Units of Measure ────────────────────────────────────────────────────────
  const uoms = await Promise.all([
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'nos'  }, update: {}, create: { name: 'Number (Nos)', abbreviation: 'nos'  } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'pcs'  }, update: {}, create: { name: 'Pieces',       abbreviation: 'pcs'  } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'box'  }, update: {}, create: { name: 'Box',          abbreviation: 'box'  } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'pck'  }, update: {}, create: { name: 'Pack',         abbreviation: 'pck'  } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'ltr'  }, update: {}, create: { name: 'Litre',        abbreviation: 'ltr'  } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'kg'   }, update: {}, create: { name: 'Kilogram',     abbreviation: 'kg'   } }),
    prisma.unitOfMeasure.upsert({ where: { abbreviation: 'set'  }, update: {}, create: { name: 'Set',          abbreviation: 'set'  } }),
  ]);
  const nosUOM = uoms[0];
  console.log('✓ UOMs created');

  // ── Categories ──────────────────────────────────────────────────────────────
  const catBrakes     = await prisma.category.upsert({ where: { name: 'Brakes'        }, update: {}, create: { name: 'Brakes',          color: '#ef4444', description: 'Brake pads, discs, calipers, fluid' } });
  const catEngine     = await prisma.category.upsert({ where: { name: 'Engine Parts'  }, update: {}, create: { name: 'Engine Parts',    color: '#f97316', description: 'Filters, gaskets, belts, timing kits' } });
  const catElectrical = await prisma.category.upsert({ where: { name: 'Electrical'    }, update: {}, create: { name: 'Electrical',      color: '#eab308', description: 'Batteries, sensors, lighting, fuses' } });
  const catSuspension = await prisma.category.upsert({ where: { name: 'Suspension'    }, update: {}, create: { name: 'Suspension',      color: '#6366f1', description: 'Shock absorbers, springs, bushings' } });
  const catLubrication= await prisma.category.upsert({ where: { name: 'Lubrication'   }, update: {}, create: { name: 'Lubrication',     color: '#14b8a6', description: 'Engine oil, gear oil, grease' } });
  const catFilters    = await prisma.category.upsert({ where: { name: 'Filters'       }, update: {}, create: { name: 'Filters',         color: '#8b5cf6', description: 'Air, oil, fuel, cabin filters' } });
  const catBodyParts  = await prisma.category.upsert({ where: { name: 'Body Parts'    }, update: {}, create: { name: 'Body Parts',      color: '#0ea5e9', description: 'Mirrors, wipers, seals' } });
  console.log('✓ Categories created');

  // ── Sub-Categories ──────────────────────────────────────────────────────────
  await prisma.subCategory.upsert({ where: { name_category_id: { name: 'Front Brakes',   category_id: catBrakes.id    } }, update: {}, create: { name: 'Front Brakes',   category_id: catBrakes.id    } });
  await prisma.subCategory.upsert({ where: { name_category_id: { name: 'Rear Brakes',    category_id: catBrakes.id    } }, update: {}, create: { name: 'Rear Brakes',    category_id: catBrakes.id    } });
  await prisma.subCategory.upsert({ where: { name_category_id: { name: 'Oil Filters',    category_id: catFilters.id   } }, update: {}, create: { name: 'Oil Filters',    category_id: catFilters.id   } });
  await prisma.subCategory.upsert({ where: { name_category_id: { name: 'Air Filters',    category_id: catFilters.id   } }, update: {}, create: { name: 'Air Filters',    category_id: catFilters.id   } });
  await prisma.subCategory.upsert({ where: { name_category_id: { name: 'Engine Oil',     category_id: catLubrication.id } }, update: {}, create: { name: 'Engine Oil',     category_id: catLubrication.id } });
  console.log('✓ Sub-categories created');

  // ── Brands ──────────────────────────────────────────────────────────────────
  const bBosch   = await prisma.brand.upsert({ where: { name: 'Bosch'        }, update: {}, create: { name: 'Bosch',        description: 'German auto parts manufacturer' } });
  const bNGK     = await prisma.brand.upsert({ where: { name: 'NGK'          }, update: {}, create: { name: 'NGK',          description: 'Japanese spark plugs & sensors' } });
  const bMobil   = await prisma.brand.upsert({ where: { name: 'Mobil'        }, update: {}, create: { name: 'Mobil',        description: 'Premium engine oils & lubricants' } });
  const bToyota  = await prisma.brand.upsert({ where: { name: 'Toyota Genuine'}, update: {}, create: { name: 'Toyota Genuine', description: 'OEM Toyota parts' } });
  const bBrembo  = await prisma.brand.upsert({ where: { name: 'Brembo'       }, update: {}, create: { name: 'Brembo',       description: 'Italian premium brake systems' } });
  const bDenso   = await prisma.brand.upsert({ where: { name: 'Denso'        }, update: {}, create: { name: 'Denso',        description: 'Japanese auto components' } });
  const bMann    = await prisma.brand.upsert({ where: { name: 'Mann-Filter'  }, update: {}, create: { name: 'Mann-Filter',  description: 'German filtration systems' } });
  const bMonroe  = await prisma.brand.upsert({ where: { name: 'Monroe'       }, update: {}, create: { name: 'Monroe',       description: 'Shock absorbers & suspension' } });
  console.log('✓ Brands created');

  // ── Suppliers ───────────────────────────────────────────────────────────────
  const sup1 = await prisma.supplier.upsert({
    where: { id: 'sup-auto-fantasy' },
    update: {},
    create: { id: 'sup-auto-fantasy', name: 'Auto Fantasy Ltd', contact_name: 'Rajan Kumar', email: 'rajan@autofantasy.lk', phone: '+94 77 234 5678', address: '45 Main Street, Colombo 03', is_active: true },
  });
  const sup2 = await prisma.supplier.upsert({
    where: { id: 'sup-parts-king' },
    update: {},
    create: { id: 'sup-parts-king', name: 'Parts King Distributors', contact_name: 'Ahmed Farook', email: 'farook@partsking.lk', phone: '+94 11 456 7890', address: '12 Industrial Zone, Biyagama', is_active: true },
  });
  const sup3 = await prisma.supplier.upsert({
    where: { id: 'sup-jap-auto' },
    update: {},
    create: { id: 'sup-jap-auto', name: 'Japan Auto Imports', contact_name: 'Yamamoto Hiroshi', email: 'info@japanautolk.com', phone: '+94 77 789 0123', address: '8 Harbour Road, Colombo 01', is_active: true },
  });
  console.log('✓ Suppliers created');

  // ── Products ────────────────────────────────────────────────────────────────
  const products = [
    // Brakes
    { item_code: 'BRK001', name: 'Brembo Front Brake Pad Set — Toyota Corolla',      category_id: catBrakes.id,     brand_id: bBrembo.id,  supplier_id: sup1.id, cost_price: 2800, retail_price: 4200,  wholesale_price: 3800, min_price: 3200, current_stock: 24, reorder_level: 5,  description: 'High-performance ceramic brake pads', vehicle_compatibility: 'Toyota Corolla 2014-2023' },
    { item_code: 'BRK002', name: 'Bosch Rear Brake Pad Set — Honda Civic',            category_id: catBrakes.id,     brand_id: bBosch.id,   supplier_id: sup1.id, cost_price: 2100, retail_price: 3200,  wholesale_price: 2900, min_price: 2500, current_stock: 18, reorder_level: 5,  vehicle_compatibility: 'Honda Civic 2016-2022' },
    { item_code: 'BRK003', name: 'Toyota Genuine Brake Disc — Front Pair',            category_id: catBrakes.id,     brand_id: bToyota.id,  supplier_id: sup3.id, cost_price: 5500, retail_price: 8200,  wholesale_price: 7500, min_price: 6500, current_stock: 3,  reorder_level: 4,  vehicle_compatibility: 'Toyota Hilux Vigo 2005-2015' },
    { item_code: 'BRK004', name: 'Brake Fluid DOT4 — 500ml',                          category_id: catBrakes.id,     brand_id: bBosch.id,   supplier_id: sup2.id, cost_price: 350,  retail_price: 580,   wholesale_price: 520, min_price: 450,  current_stock: 0,  reorder_level: 10, description: 'DOT4 specification, 500ml bottle' },

    // Engine Filters
    { item_code: 'FLT001', name: 'Mann-Filter Oil Filter — Toyota 1KD/2KD',           category_id: catFilters.id,    brand_id: bMann.id,    supplier_id: sup2.id, cost_price: 480,  retail_price: 750,   wholesale_price: 680, min_price: 600,  current_stock: 85, reorder_level: 20, vehicle_compatibility: 'Toyota Hilux / Fortuner 1KD-FTV, 2KD-FTV' },
    { item_code: 'FLT002', name: 'Bosch Air Filter — Honda Civic 1.8L',               category_id: catFilters.id,    brand_id: bBosch.id,   supplier_id: sup1.id, cost_price: 620,  retail_price: 950,   wholesale_price: 860, min_price: 750,  current_stock: 32, reorder_level: 10, vehicle_compatibility: 'Honda Civic FB 2012-2015' },
    { item_code: 'FLT003', name: 'Denso Fuel Filter — Nissan X-Trail',                category_id: catFilters.id,    brand_id: bDenso.id,   supplier_id: sup3.id, cost_price: 780,  retail_price: 1200,  wholesale_price: 1080, min_price: 950, current_stock: 15, reorder_level: 8, vehicle_compatibility: 'Nissan X-Trail T30/T31 2003-2013' },
    { item_code: 'FLT004', name: 'Toyota Genuine Oil Filter — 2AZ/1AZ Engine',        category_id: catFilters.id,    brand_id: bToyota.id,  supplier_id: sup3.id, cost_price: 320,  retail_price: 520,   wholesale_price: 470, min_price: 400,  current_stock: 120,reorder_level: 30, vehicle_compatibility: 'Toyota Camry, RAV4, Wish 2002-2015' },

    // Engine Oil
    { item_code: 'OIL001', name: 'Mobil 1 Engine Oil 5W-30 — 1 Litre',               category_id: catLubrication.id,brand_id: bMobil.id,   supplier_id: sup1.id, cost_price: 1100, retail_price: 1650,  wholesale_price: 1500, min_price: 1300, current_stock: 48, reorder_level: 12, description: 'Full synthetic 5W-30, API SN/CF' },
    { item_code: 'OIL002', name: 'Mobil 1 Engine Oil 10W-40 — 4 Litre',              category_id: catLubrication.id,brand_id: bMobil.id,   supplier_id: sup1.id, cost_price: 3800, retail_price: 5600,  wholesale_price: 5100, min_price: 4500, current_stock: 2,  reorder_level: 6,  description: 'Semi-synthetic 10W-40, 4L can' },
    { item_code: 'OIL003', name: 'Toyota Gear Oil GL-5 85W-90 — 1 Litre',            category_id: catLubrication.id,brand_id: bToyota.id,  supplier_id: sup3.id, cost_price: 650,  retail_price: 980,   wholesale_price: 890, min_price: 800,  current_stock: 30, reorder_level: 10, description: 'Manual gearbox oil GL-5 grade' },

    // Electrical
    { item_code: 'ELC001', name: 'NGK Spark Plug BKR6E — Single',                    category_id: catElectrical.id, brand_id: bNGK.id,     supplier_id: sup2.id, cost_price: 280,  retail_price: 420,   wholesale_price: 380, min_price: 320,  current_stock: 200,reorder_level: 40, vehicle_compatibility: 'Universal — most petrol engines' },
    { item_code: 'ELC002', name: 'Bosch Lambda O2 Sensor — Toyota Corolla',           category_id: catElectrical.id, brand_id: bBosch.id,   supplier_id: sup1.id, cost_price: 3200, retail_price: 4800,  wholesale_price: 4300, min_price: 3800, current_stock: 8,  reorder_level: 3, vehicle_compatibility: 'Toyota Corolla E140 2007-2013' },
    { item_code: 'ELC003', name: 'Denso Alternator — Nissan Sunny',                   category_id: catElectrical.id, brand_id: bDenso.id,   supplier_id: sup3.id, cost_price: 12000,retail_price: 18500, wholesale_price: 16500,min_price:14000, current_stock: 4,  reorder_level: 2, vehicle_compatibility: 'Nissan Sunny N17 2012-2019' },

    // Suspension
    { item_code: 'SUS001', name: 'Monroe Shock Absorber Front — Toyota Corolla',      category_id: catSuspension.id, brand_id: bMonroe.id,  supplier_id: sup1.id, cost_price: 4500, retail_price: 6800,  wholesale_price: 6100, min_price: 5500, current_stock: 12, reorder_level: 4, vehicle_compatibility: 'Toyota Corolla AE100/AE110/ZZE122' },
    { item_code: 'SUS002', name: 'Monroe Shock Absorber Rear — Toyota Corolla',       category_id: catSuspension.id, brand_id: bMonroe.id,  supplier_id: sup1.id, cost_price: 3800, retail_price: 5600,  wholesale_price: 5100, min_price: 4600, current_stock: 0,  reorder_level: 4, vehicle_compatibility: 'Toyota Corolla AE100/AE110/ZZE122' },
    { item_code: 'SUS003', name: 'Front Stabilizer Bar Link — Toyota Hilux Vigo',     category_id: catSuspension.id, brand_id: bToyota.id,  supplier_id: sup3.id, cost_price: 1200, retail_price: 1850,  wholesale_price: 1680, min_price: 1500, current_stock: 22, reorder_level: 6, vehicle_compatibility: 'Toyota Hilux Vigo KUN25/26 2005-2015' },

    // Engine Parts
    { item_code: 'ENG001', name: 'Timing Belt Kit — Honda Civic 1.8L',               category_id: catEngine.id,     brand_id: bDenso.id,   supplier_id: sup2.id, cost_price: 5800, retail_price: 8500,  wholesale_price: 7700, min_price: 6800, current_stock: 6,  reorder_level: 3, vehicle_compatibility: 'Honda Civic FK/FB 2012-2015 R18A' },
    { item_code: 'ENG002', name: 'Cylinder Head Gasket — Toyota 2AZ-FE',             category_id: catEngine.id,     brand_id: bToyota.id,  supplier_id: sup3.id, cost_price: 3200, retail_price: 4800,  wholesale_price: 4300, min_price: 3800, current_stock: 9,  reorder_level: 3, vehicle_compatibility: 'Toyota Camry ACV30/40, RAV4 2002-2012' },
    { item_code: 'ENG003', name: 'Serpentine Drive Belt — Nissan Almera',             category_id: catEngine.id,     brand_id: bBosch.id,   supplier_id: sup2.id, cost_price: 880,  retail_price: 1350,  wholesale_price: 1200, min_price: 1050, current_stock: 25, reorder_level: 8, vehicle_compatibility: 'Nissan Almera N16 2000-2006' },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { item_code: p.item_code } });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          ...p,
          is_active: true,
          reorder_qty: p.reorder_level * 2,
          base_uom_id: nosUOM.id,
          bulk_qty: 1,
        },
      });
      // Opening stock movement
      if (p.current_stock > 0) {
        await prisma.stockMovement.create({
          data: { product_id: product.id, type: 'OPENING', quantity: p.current_stock, balance: p.current_stock, notes: 'Initial seed stock' },
        });
      }
    }
  }
  console.log('✓ Products created');

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('📧 Login: admin@posworkshop.com');
  console.log('🔑 Password: Admin@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
