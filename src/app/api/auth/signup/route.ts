import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validations/auth';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("DB:", process.env.DATABASE_URL);
  console.log("DIRECT:", process.env.DIRECT_URL);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // your existing logic continues here...
}

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { email, password, full_name, role, phone } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        full_name: full_name ?? null,
        role,
        phone: phone ?? null,
      },
      select: {
        id: true, email: true, full_name: true, role: true, created_at: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error('[SIGNUP ERROR]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create account: ${message}` }, { status: 500 });
  }
}
