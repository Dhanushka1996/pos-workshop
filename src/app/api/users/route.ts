import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * Admin only — list all users with pagination + filters.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role   = searchParams.get('role');
  const active = searchParams.get('active');
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));

  const where: Record<string, unknown> = {};
  if (role && ['admin', 'cashier', 'mechanic'].includes(role)) where.role = role;
  if (active !== null) where.is_active = active === 'true';

  const [profiles, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id: true, email: true, full_name: true, role: true,
        phone: true, avatar_url: true, is_active: true,
        created_at: true, updated_at: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ profiles, pagination: { page, limit, total } });
}

const updateUserSchema = z.object({
  userId:    z.string().min(1),
  role:      z.enum(['admin', 'cashier', 'mechanic']).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().min(2).max(80).optional(),
});

/**
 * PATCH /api/users
 * Admin only — update any user's role or active status.
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { userId, ...updates } = parsed.data;

  if (userId === session.user.id && updates.is_active === false) {
    return NextResponse.json(
      { error: 'You cannot deactivate your own account' },
      { status: 400 }
    );
  }

  const profile = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: {
      id: true, email: true, full_name: true, role: true,
      phone: true, avatar_url: true, is_active: true,
      created_at: true, updated_at: true,
    },
  });

  return NextResponse.json({ profile });
}
