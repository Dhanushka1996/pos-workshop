import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { z } from 'zod';
import { generateAssemblyRef, generateAssemblyItemCode } from '@/lib/sequences';

const componentSchema = z.object({
  product_id:     z.string().min(1),
  qty_total:      z.number().positive(),
  allocated_cost: z.number().min(0).default(0),
  notes:          z.string().optional(),
});

const createSchema = z.union([
  // Mode A — link to an existing product
  z.object({
    product_id:    z.string().min(1, 'Parent product is required'),
    product_data:  z.undefined(),
    reference:     z.string().optional(),
    purchase_cost: z.number().min(0).default(0),
    notes:         z.string().optional(),
    components:    z.array(componentSchema).optional(),
  }),
  // Mode B — create a new product inline
  z.object({
    product_id:   z.undefined(),
    product_data: z.object({
      name:        z.string().min(1, 'Assembly name is required'),
      item_code:   z.string().optional(),
      category_id: z.string().optional(),
      brand_id:    z.string().optional(),
      cost_price:  z.number().min(0).default(0),
    }),
    reference:     z.string().optional(),
    purchase_cost: z.number().min(0).default(0),
    notes:         z.string().optional(),
    components:    z.array(componentSchema).optional(),
  }),
]);

// GET /api/assemblies — list all assemblies with summary info
export async function GET(req: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma'); // 
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('q')?.trim() ?? '';

    const assemblies = await prisma.assembly.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search ? {
          OR: [
            { product:    { name:      { contains: search } } },
            { product:    { item_code: { contains: search } } },
            { ref_number: { contains: search } },
            { reference:  { contains: search } },
          ],
        } : {}),
      },
      include: {
        product: {
          select: { id: true, item_code: true, name: true, current_stock: true, product_type: true },
        },
        components: {
          select: {
            id: true, qty_total: true, qty_extracted: true,
            product: { select: { id: true, name: true } },
          },
        },
        _count: { select: { dismantle_logs: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(assemblies);
  } catch (err) {
    console.error('[GET /api/assemblies]', err);
    return NextResponse.json({ error: 'Failed to fetch assemblies' }, { status: 500 });
  }
}

// POST /api/assemblies — create assembly (optionally creating product inline)
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { reference, purchase_cost, notes, components } = parsed.data;

    // ── Validate / resolve component list ─────────────────────────────────
    if (components?.length) {
      const ids = components.map(c => c.product_id);
      if (new Set(ids).size !== ids.length) {
        return NextResponse.json({ error: 'Duplicate component products' }, { status: 422 });
      }
    }

    // ── Auto-generate reference number ─────────────────────────────────────
    const ref_number = await generateAssemblyRef();

    // ── Resolve/create the parent product ─────────────────────────────────
    let productId: string;

    if (parsed.data.product_data) {
      const pd = parsed.data.product_data;

      // Resolve or generate item code
      let itemCode = pd.item_code?.trim() || '';
      if (!itemCode) {
        itemCode = await generateAssemblyItemCode();
      }

      // Check item code uniqueness
      const existing = await prisma.product.findUnique({ where: { item_code: itemCode } });
      if (existing) {
        return NextResponse.json({ error: `Item code "${itemCode}" already exists` }, { status: 409 });
      }

      // Create product with ASSEMBLY type
      const product = await prisma.product.create({
        data: {
          name:         pd.name,
          item_code:    itemCode,
          category_id:  pd.category_id || null,
          brand_id:     pd.brand_id    || null,
          cost_price:   pd.cost_price ?? purchase_cost,
          product_type: 'ASSEMBLY',
          is_assembly:  true,
          track_stock:  true,
          current_stock: 0,
        },
        select: { id: true },
      });
      productId = product.id;
    } else {
      // Mode A — existing product
      productId = parsed.data.product_id!;
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      // Guard: parent cannot appear in its own components
      if (components?.some(c => c.product_id === productId)) {
        return NextResponse.json(
          { error: 'A component cannot be the same as the assembly parent' },
          { status: 422 },
        );
      }

      // Mark the existing product as assembly type
      await prisma.product.update({
        where: { id: productId },
        data:  { product_type: 'ASSEMBLY', is_assembly: true },
      });
    }

    // ── Create assembly record ─────────────────────────────────────────────
    const assembly = await prisma.assembly.create({
      data: {
        product_id:    productId,
        ref_number,
        reference,
        purchase_cost,
        notes,
        status: 'intact',
        components: components?.length ? {
          create: components.map(c => ({
            product_id:     c.product_id,
            qty_total:      c.qty_total,
            allocated_cost: c.allocated_cost,
            notes:          c.notes,
          })),
        } : undefined,
      },
      include: {
        product:    { select: { id: true, item_code: true, name: true, product_type: true } },
        components: { include: { product: { select: { id: true, item_code: true, name: true } } } },
      },
    });

    return NextResponse.json(assembly, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assemblies]', err);
    return NextResponse.json({ error: 'Failed to create assembly' }, { status: 500 });
  }
}
