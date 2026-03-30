import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const raw = process.env.DATABASE_URL ?? '(not set)';

  // Mask password but keep host/port visible
  let masked = raw;
  try {
    const u = new URL(raw);
    u.password = '****';
    masked = u.toString();
  } catch {
    masked = raw.replace(/:([^:@]+)@/, ':****@');
  }

  const isDirectUrl =
    raw.includes(':6543') && raw.includes('supabase.co') && !raw.includes('pooler');

  return NextResponse.json({
    masked_url: masked,
    is_direct_connection: isDirectUrl,
    hint: isDirectUrl
      ? '❌ This is the DIRECT connection URL (port 6543). Vercel cannot reach it. You must use the POOLER URL (port 6543, host contains "pooler.supabase.com").'
      : raw === '(not set)'
      ? '❌ DATABASE_URL is not set at all in this environment.'
      : '✅ URL looks like a pooler or non-Supabase connection.',
  });
}
