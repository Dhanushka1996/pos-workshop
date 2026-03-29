'use client';

import { SessionProvider } from 'next-auth/react';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
