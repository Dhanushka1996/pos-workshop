import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ImportRow, ExecuteResult } from '@/lib/import/itemImport';

/**
 * POST /api/import/items/execute
 * Body: { mode: 'create' | 'upsert', rows: ImportRow[] }
 *
 * - Auto-creates missing Categories, Sub-Categories, Brands, Suppliers
 * - In 'create' mode: inserts new items, skips existing
 * - In 'upsert' mode: inserts new + updates existing by item_code
 * - Returns { created, updated, skipped, failed, errors }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mode?: string; rows?: ImportRow[] };
    const { mode, rows } = body;

    if (!mode || (mode !== 'create' && mode !== 'upsert')) {
      return NextResponse.json({ error: 'mode must be "create" or "upsert"' }, { status: 400 });
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    // ── Step 1: Collect rows to process ───────────────────────────────
    // Only process rows the client flagged as valid or exists
    // (never process error/duplicate rows — re-validate server-side)
    const toProcess = rows.filter(r => {
      if (r.status === 'error' || r.status === 'duplicate') return false;
      if (r.status === 'exists' && mode === 'create') return false; // will be skipped
      return true;
    });

    const skipped = rows.filter(r => r.status === 'exists' && mode === 'create').length;

    if (toProcess.length === 0) {
      return NextResponse.json<ExecuteResult>({
        created: 0, updated: 0, skipped, failed: 0, errors: [],
      });
    }

    // ── Step 2: Load all existing master data into in-memory maps ─────
    const [categories, brands, suppliers, uoms, subCats] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.supplier.findMany({ select: { id: true, name: true } }),
      prisma.unitOfMeasure.findMany({ select: { id: true, name: true, abbreviation: true } }),
      prisma.subCategory.findMany({ select: { id: true, name: true, category_id: true } }),
    ]);

    const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const bndMap = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));
    const supMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
    const uomMap = new Map<string, string>([
      ...uoms.map(u => [u.name.toLowerCase(),         u.id] as [string, string]),
      ...uoms.map(u => [u.abbreviation.toLowerCase(), u.id] as [string, string]),
    ]);
    // key: `${category_id}:${subcat_name_lower}`
    const subMap = new Map(subCats.map(s => [`${s.category_id}:${s.name.toLowerCase()}`, s.id]));

    // ── Step 3: Auto-create missing master data ────────────────────────
    // Collect unique names needed per entity type
    const needCats = new Set<string>();
    const needBnds = new Set<string>();
    const needSups = new Set<string>();
    // sub-cats are dependent on categories, handled after cat creation
    const needSubs = new Map<string, Set<string>>(); // catNameLower → Set<subNameRaw>

    for (const r of toProcess) {
      const { category, sub_category, brand, supplier } = r.data;
      if (category && !catMap.has(category.toLowerCase()))     needCats.add(category);
      if (brand    && !bndMap.has(brand.toLowerCase()))        needBnds.add(brand);
      if (supplier && !supMap.has(supplier.toLowerCase()))     needSups.add(supplier);
      if (category && sub_category) {
        const k = category.toLowerCase();
        if (!needSubs.has(k)) needSubs.set(k, new Set());
        needSubs.get(k)!.add(sub_category);
      }
    }

    // Create categories
    for (const name of Array.from(needCats)) {
      try {
        const created = await prisma.category.create({ data: { name } });
        catMap.set(name.toLowerCase(), created.id);
      } catch {
        // Already exists (concurrent import / race condition) — re-fetch
        const existing = await prisma.category.findFirst({
          where: { name }, select: { id: true },
        });
        if (existing) catMap.set(name.toLowerCase(), existing.id);
      }
    }

    // Create brands
    for (const name of Array.from(needBnds)) {
      try {
        const created = await prisma.brand.create({ data: { name } });
        bndMap.set(name.toLowerCase(), created.id);
      } catch {
        const existing = await prisma.brand.findFirst({ where: { name }, select: { id: true } });
        if (existing) bndMap.set(name.toLowerCase(), existing.id);
      }
    }

    // Create suppliers
    for (const name of Array.from(needSups)) {
      try {
        const created = await prisma.supplier.create({ data: { name } });
        supMap.set(name.toLowerCase(), created.id);
      } catch {
        const existing = await prisma.supplier.findFirst({ where: { name }, select: { id: true } });
        if (existing) supMap.set(name.toLowerCase(), existing.id);
      }
    }

    // Create sub-categories (now that categories exist)
    for (const [catNameLower, subNames] of Array.from(needSubs.entries())) {
      const catId = catMap.get(catNameLower);
      if (!catId) continue;

      for (const subName of Array.from(subNames)) {
        const mapKey = `${catId}:${subName.toLowerCase()}`;
        if (subMap.has(mapKey)) continue;
        try {
          const created = await prisma.subCategory.create({
            data: { name: subName, category_id: catId },
          });
          subMap.set(mapKey, created.id);
        } catch {
          const existing = await prisma.subCategory.findFirst({
            where: { name: subName, category_id: catId }, select: { id: true },
          });
          if (existing) subMap.set(mapKey, existing.id);
        }
      }
    }

    // ── Step 4: Process each row ───────────────────────────────────────
    let created = 0;
    let updated = 0;
    let failed  = 0;
    const errors: ExecuteResult['errors'] = [];

    for (const row of toProcess) {
      const { data, status } = row;

      try {
        // Resolve foreign keys
        const categoryId    = catMap.get(data.category.toLowerCase())    ?? null;
        const brandId       = bndMap.get(data.brand.toLowerCase())       ?? null;
        const supplierId    = supMap.get(data.supplier.toLowerCase())    ?? null;
        const baseUomId     = uomMap.get(data.base_unit.toLowerCase())   ?? null;

        const subCategoryId = (categoryId && data.sub_category)
          ? (subMap.get(`${categoryId}:${data.sub_category.toLowerCase()}`) ?? null)
          : null;

        const productFields = {
          name:            data.name,
          category_id:     categoryId,
          sub_category_id: subCategoryId,
          brand_id:        brandId,
          supplier_id:     supplierId,
          base_uom_id:     baseUomId,
          cost_price:      data.cost_price,
          retail_price:    data.retail_price,
          wholesale_price: data.wholesale_price,
          min_price:       data.min_price,
          reorder_level:   data.reorder_level,
          reorder_qty:     data.reorder_qty,
        };

        if (status === 'exists') {
          // ── UPDATE ────────────────────────────────────────────────
          const product = await prisma.product.update({
            where: { item_code: data.item_code },
            data:  productFields,
            select: { id: true },
          });

          // Add barcode if provided and not already linked to this product
          if (data.barcode) {
            const existing = await prisma.barcode.findFirst({
              where: { barcode: data.barcode },
            });
            if (!existing) {
              await prisma.barcode.create({
                data: { product_id: product.id, barcode: data.barcode, is_primary: false },
              });
            }
          }

          updated++;
        } else {
          // ── CREATE ────────────────────────────────────────────────
          const product = await prisma.product.create({
            data: { item_code: data.item_code, ...productFields },
            select: { id: true },
          });

          // Add barcode
          if (data.barcode) {
            await prisma.barcode.create({
              data: { product_id: product.id, barcode: data.barcode, is_primary: true },
            }).catch(() => { /* barcode collision — skip silently */ });
          }

          created++;
        }
      } catch (err) {
        failed++;
        errors.push({
          rowNum:    row.rowNum,
          item_code: data.item_code,
          error:     err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json<ExecuteResult>({ created, updated, skipped, failed, errors });
  } catch (err) {
    console.error('[execute] error:', err);
    const msg = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
