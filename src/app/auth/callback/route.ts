// Supabase auth callback removed — NextAuth handles its own callbacks at /api/auth/[...nextauth].
// This route is no longer needed.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.redirect('/login');
}
