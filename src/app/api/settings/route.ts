import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingSchema = z.object({
  business_name:   z.string().min(1).max(200).optional(),
  currency_code:   z.string().min(2).max(10).optional(),
  currency_symbol: z.string().min(1).max(10).optional(),
  symbol_position: z.enum(['before', 'after']).optional(),
  decimal_places:  z.number().int().min(0).max(4).optional(),
  tax_rate:        z.number().min(0).max(100).optional(),
  receipt_footer:  z.string().nullable().optional(),
});

// GET /api/settings — returns the singleton row (creates defaults if missing)
export async function GET() {
  try {
    const settings = await prisma.setting.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global' },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT /api/settings — partial update of settings
export async function PUT(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = settingSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const settings = await prisma.setting.upsert({
      where:  { id: 'global' },
      update: parsed.data,
      create: { id: 'global', ...parsed.data },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error('[PUT /api/settings]', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
