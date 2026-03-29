'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Profile } from '@/types';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const profile: Profile | null = session?.user
    ? {
        id:         session.user.id,
        email:      session.user.email!,
        full_name:  session.user.name ?? null,
        role:       session.user.role as Profile['role'],
        avatar_url: null,
        phone:      null,
        is_active:  session.user.is_active,
        created_at: '',
        updated_at: '',
      }
    : null;

  const signOut = async () => {
    await nextAuthSignOut({ redirect: false });
    router.push('/login');
  };

  return {
    profile,
    isLoading: status === 'loading',
    signOut,
  };
}
