import { NextResponse } from 'next/server';
import { buildTemplate } from '@/lib/import/itemImport';

export const dynamic = 'force-dynamic';

/**
 * GET /api/import/items/template
 * Returns a downloadable Excel file with headers, sample rows, and instructions.
 */
export async function GET() {
  try {
    const buffer = buildTemplate();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="item-import-template.xlsx"',
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[template] error:', err);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
