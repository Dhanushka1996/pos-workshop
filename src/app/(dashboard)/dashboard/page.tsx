import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ShoppingCart,
  Wrench,
  Package,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { RoleCard } from '@/components/dashboard/RoleCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { RoleBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { Profile, UserRole } from '@/types';

// Role-specific quick stats (placeholder data — replace with real queries)
function getRoleStats(role: UserRole) {
  switch (role) {
    case 'admin':
      return [
        { label: 'Total Sales Today',   value: '$4,280',  icon: <TrendingUp className="size-5" />,  color: 'brand'   as const, trend: { value: '12%', positive: true  } },
        { label: 'Open Job Orders',     value: '14',      icon: <Wrench className="size-5" />,       color: 'amber'   as const, trend: { value: '3',   positive: false } },
        { label: 'Low Stock Items',     value: '7',       icon: <Package className="size-5" />,      color: 'rose'    as const },
        { label: 'Active Staff',        value: '12',      icon: <Users className="size-5" />,        color: 'emerald' as const },
      ];
    case 'cashier':
      return [
        { label: 'Invoices Today',      value: '38',      icon: <ShoppingCart className="size-5" />, color: 'brand'   as const, trend: { value: '8%', positive: true } },
        { label: 'Revenue Today',       value: '$4,280',  icon: <TrendingUp className="size-5" />,   color: 'emerald' as const, trend: { value: '12%', positive: true } },
        { label: 'Pending Payments',    value: '3',       icon: <Clock className="size-5" />,        color: 'amber'   as const },
        { label: 'Returns Today',       value: '1',       icon: <AlertCircle className="size-5" />,  color: 'rose'    as const },
      ];
    case 'mechanic':
      return [
        { label: 'Jobs Assigned',       value: '5',       icon: <Wrench className="size-5" />,       color: 'brand'   as const },
        { label: 'Jobs Completed Today',value: '3',       icon: <CheckCircle2 className="size-5" />, color: 'emerald' as const },
        { label: 'Parts Requested',     value: '2',       icon: <Package className="size-5" />,      color: 'amber'   as const },
        { label: 'Hours Logged',        value: '6.5h',    icon: <Clock className="size-5" />,        color: 'sky'     as const },
      ];
  }
}

const RECENT_ACTIVITY = [
  { text: 'Invoice #1042 created',       time: '2 min ago',  dot: 'bg-emerald-400' },
  { text: 'Job Order #JO-88 updated',    time: '15 min ago', dot: 'bg-brand-400'   },
  { text: 'Low stock alert: Brake Pads', time: '1 hr ago',   dot: 'bg-amber-400'   },
  { text: 'New user Casey joined',       time: '3 hr ago',   dot: 'bg-sky-400'     },
  { text: 'Daily report generated',      time: 'Yesterday',  dot: 'bg-zinc-500'    },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  const profile: Profile = {
    id:         user.id,
    email:      user.email,
    full_name:  user.full_name,
    role:       user.role as UserRole,
    avatar_url: user.avatar_url,
    phone:      user.phone,
    is_active:  user.is_active,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };

  const stats = getRoleStats(profile.role as UserRole);

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      <WelcomeBanner profile={profile} />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-600 mb-4">
          At a Glance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-600 mb-4">
            Your Role
          </h2>
          <RoleCard role={profile.role as UserRole} />
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-600 mb-4">
            Recent Activity
          </h2>
          <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 divide-y divide-white/[0.05]">
            {RECENT_ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-150"
              >
                <span className={`size-2 rounded-full flex-shrink-0 ${item.dot}`} />
                <p className="text-sm text-zinc-300 flex-1">{item.text}</p>
                <p className="text-xs text-zinc-600 flex-shrink-0">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/30 px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Account</p>
          <p className="text-sm text-white font-medium mt-0.5">{profile.full_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Email</p>
          <p className="text-sm text-white font-medium mt-0.5">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Role</p>
          <div className="mt-1">
            <RoleBadge role={profile.role as UserRole} />
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Member Since</p>
          <p className="text-sm text-white font-medium mt-0.5">{formatDate(profile.created_at)}</p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Active
          </div>
        </div>
      </div>
    </div>
  );
}
