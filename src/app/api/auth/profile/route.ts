import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateProfileSchema } from '@/lib/validations/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/profile
 * Returns the authenticated user's profile.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, full_name: true, role: true,
      phone: true, avatar_url: true, is_active: true,
      created_at: true, updated_at: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  return NextResponse.json({ profile: user });
}

/**
 * PATCH /api/auth/profile
 * Updates the authenticated user's own profile (non-role fields).
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true, email: true, full_name: true, role: true,
      phone: true, avatar_url: true, is_active: true,
      created_at: true, updated_at: true,
    },
  });

  return NextResponse.json({ profile: user });
}
