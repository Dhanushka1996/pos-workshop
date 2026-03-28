import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { User, Mail, Phone, Shield } from 'lucide-react';
import { RoleBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { UserRole } from '@/types';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  return (
    <div className="p-6 md:p-8 max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.07] flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-brand-500/80 to-violet-600/80 flex items-center justify-center text-white text-xl font-bold ring-4 ring-white/5">
            {getInitials(user.full_name)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {user.full_name ?? 'Unnamed User'}
            </h2>
            <p className="text-zinc-400 text-sm">{user.email}</p>
            <div className="mt-2">
              <RoleBadge role={user.role as UserRole} />
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="divide-y divide-white/[0.05]">
          {[
            { icon: User,   label: 'Full Name', value: user.full_name ?? '—' },
            { icon: Mail,   label: 'Email',     value: user.email            },
            { icon: Phone,  label: 'Phone',     value: user.phone ?? '—'     },
            { icon: Shield, label: 'Role',      value: user.role             },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon className="size-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-600 uppercase tracking-wider">{label}</p>
                <p className="text-sm text-white font-medium mt-0.5 capitalize">{value}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 px-6 py-4">
            <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <span className="text-zinc-400 text-xs font-bold">ID</span>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">User ID</p>
              <p className="text-sm text-white font-mono mt-0.5">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/[0.02] flex items-center justify-between text-xs text-zinc-600">
          <span>Account created {formatDate(user.created_at.toISOString())}</span>
          <span>Last updated {formatDate(user.updated_at.toISOString())}</span>
        </div>
      </div>

      <p className="text-xs text-zinc-700 mt-6 text-center">
        Profile editing coming in the next release.
      </p>
    </div>
  );
}
