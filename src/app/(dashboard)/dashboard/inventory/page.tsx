'use client';

import Link from 'next/link';
import {
  Package, TrendingDown, AlertTriangle, DollarSign,
  ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Plus, ChevronRight, Layers, Award, Truck, Activity,
} from 'lucide-react';
import { useInventoryDashboard } from '@/hooks/inventory/useInventoryDashboard';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
}

function MovementTypeBadge({ type }: { type: string }) {
  if (type === 'in') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
      <ArrowUpCircle className="size-3" /> In
    </span>
  );
  if (type === 'out') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
      <ArrowDownCircle className="size-3" /> Out
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
      <RefreshCw className="size-3" /> Adj
    </span>
  );
}

const QUICK_LINKS = [
  { label: 'Products', desc: 'Manage all parts', href: '/dashboard/inventory/products', icon: Package, color: 'indigo' },
  { label: 'Stock Log', desc: 'View movements', href: '/dashboard/inventory/stock', icon: Activity, color: 'emerald' },
  { label: 'Categories', desc: 'Part categories', href: '/dashboard/inventory/categories', icon: Layers, color: 'amber' },
  { label: 'Brands', desc: 'Product brands', href: '/dashboard/inventory/brands', icon: Award, color: 'purple' },
  { label: 'Suppliers', desc: 'Your suppliers', href: '/dashboard/inventory/suppliers', icon: Truck, color: 'sky' },
];

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
};

export default function InventoryDashboardPage() {
  const { data, isLoading }          = useInventoryDashboard();
  const { fmt: formatCurrency }      = useCurrency();

  const stats = [
    {
      label: 'Total Products',
      value: isLoading ? '—' : data?.totalProducts ?? 0,
      icon: Package,
      color: 'indigo',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      iconColor: 'text-indigo-400',
      hint: 'Active parts in catalogue',
    },
    {
      label: 'Inventory Value',
      value: isLoading ? '—' : formatCurrency(data?.totalValue ?? 0),
      icon: DollarSign,
      color: 'emerald',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      hint: 'Based on cost price',
    },
    {
      label: 'Low Stock',
      value: isLoading ? '—' : data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: 'amber',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-400',
      hint: 'Needs restocking soon',
      alert: (data?.lowStockCount ?? 0) > 0,
    },
    {
      label: 'Out of Stock',
      value: isLoading ? '—' : data?.outOfStockCount ?? 0,
      icon: TrendingDown,
      color: 'red',
      iconBg: 'bg-red-500/10 border-red-500/20',
      iconColor: 'text-red-400',
      hint: 'Zero stock items',
      alert: (data?.outOfStockCount ?? 0) > 0,
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your auto parts catalogue and stock levels</p>
        </div>
        <Link
          href="/dashboard/inventory/products/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          Add Product
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'rounded-2xl border bg-zinc-900/50 p-5 transition-all',
                stat.alert ? 'border-amber-500/20' : 'border-white/[0.07]'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn('size-10 rounded-xl border flex items-center justify-center', stat.iconBg)}>
                  <Icon className={cn('size-5', stat.iconColor)} />
                </div>
                {stat.alert && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    Action needed
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
              <p className="text-sm font-medium text-zinc-300 mt-1">{stat.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Movements */}
        <div className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-zinc-400" />
              <h2 className="font-semibold text-white text-sm">Recent Stock Movements</h2>
            </div>
            <Link
              href="/dashboard/inventory/stock"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="h-4 bg-zinc-800 rounded-lg w-20" />
                    <div className="h-4 bg-zinc-800 rounded-lg w-40 flex-1" />
                    <div className="h-6 bg-zinc-800 rounded-full w-16" />
                    <div className="h-4 bg-zinc-800 rounded-lg w-8" />
                  </div>
                ))
              : !data?.recentMovements?.length
              ? (
                  <div className="px-5 py-12 text-center text-zinc-600 text-sm">
                    No stock movements yet
                  </div>
                )
              : data.recentMovements.map((m: any) => (
                  <div key={m.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs text-zinc-600 whitespace-nowrap w-28 shrink-0">
                      {formatDate(m.created_at)}
                    </span>
                    <p className="text-sm text-white font-medium flex-1 truncate">{m.product.name}</p>
                    <MovementTypeBadge type={m.type} />
                    <span className={cn(
                      'text-sm font-bold w-10 text-right',
                      m.type === 'in' ? 'text-emerald-400' : m.type === 'out' ? 'text-red-400' : 'text-sky-400'
                    )}>
                      {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}{m.quantity}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-semibold text-white text-sm">Quick Navigation</h2>
          </div>
          <div className="p-3 space-y-1">
            {QUICK_LINKS.map(({ label, desc, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition-all group"
              >
                <div className={cn('size-9 rounded-xl border flex items-center justify-center shrink-0', colorMap[color])}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-zinc-600">{desc}</p>
                </div>
                <ChevronRight className="size-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
