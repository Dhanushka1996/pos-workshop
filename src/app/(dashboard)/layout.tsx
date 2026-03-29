import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect('/login');

  if (!user.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-semibold">Account Deactivated</p>
          <p className="text-zinc-500 text-sm">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const profile: Profile = {
    id:         user.id,
    email:      user.email,
    full_name:  user.full_name,
    role:       user.role as Profile['role'],
    avatar_url: user.avatar_url,
    phone:      user.phone,
    is_active:  user.is_active,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <DashboardHeader profile={profile} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={profile.role} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
