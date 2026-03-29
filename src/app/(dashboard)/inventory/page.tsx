'use client';

import { useRouter } from 'next/navigation';
import {
  Package, AlertTriangle, XCircle, TrendingUp,
  ArrowRight, Plus, FileText, BarChart2, RefreshCw,
} from 'lucide-react';
import { useInventoryDashboard } from '@/hooks/inventory/useInventoryDashboard';
import { StockBadge, MovementTypeBadge } from '@/components/inventory/StockBadge';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StatCardProps {
  label:     string;
  value:     string | number;
  sub?:      string;
  icon:      React.ElementType;
  color:     string;
  onClick?:  () => void;
}

function StatCard({ label, value, sub, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn('group rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-5 text-left hover:bg-zinc-900 transition-all', onClick && 'cursor-pointer')}
    >
      <div className="flex items-start justify-between">
        <div className={cn('size-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="size-5" />
        </div>
        {onClick && <ArrowRight className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

export default function InventoryDashboardPage() {
  const router     = useRouter();
  const { data, isLoading, refetch } = useInventoryDashboard();
  const { fmt }    = useCurrency();
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Items',       value: data?.total_products ?? 0,  sub: `${data?.active_products ?? 0} active`,  icon: Package,       color: 'bg-brand-500/10 text-brand-400',   onClick: () => router.push('/dashboard/inventory/items') },
    { label: 'Low Stock',         value: data?.low_stock ?? 0,        sub: 'Need reorder soon',                   icon: AlertTriangle,  color: 'bg-amber-500/10 text-amber-400',   onClick: () => router.push('/dashboard/inventory/items?status=low_stock') },
    { label: 'Out of Stock',      value: data?.out_of_stock ?? 0,     sub: 'Zero quantity items',                 icon: XCircle,        color: 'bg-red-500/10 text-red-400',       onClick: () => router.push('/dashboard/inventory/items?status=out_of_stock') },
    { label: 'Inventory Value',   value: fmt(data?.total_stock_value ?? 0), sub: `Retail: ${fmt(data?.total_retail_value ?? 0)}`, icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventory Overview</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Real-time stock status and activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button onClick={() => router.push('/dashboard/inventory/items/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all">
            <Plus className="size-4" />Add Item
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Receive Stock',      sub: 'Create GRN',           icon: FileText,      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', href: '/dashboard/inventory/grn/new' },
          { label: 'Stock Adjustment',   sub: 'Manual correction',    icon: RefreshCw,     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       href: '/dashboard/inventory/adjustments' },
          { label: 'View All Items',     sub: 'Item Master list',      icon: Package,       color: 'bg-brand-500/10 text-brand-400 border-brand-500/20',       href: '/dashboard/inventory/items' },
          { label: 'Suppliers',          sub: 'Manage suppliers',      icon: BarChart2,     color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',    href: '/dashboard/inventory/suppliers' },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className={cn('group flex items-center gap-3 rounded-xl border p-4 text-left hover:scale-[1.02] transition-all', a.color)}
            >
              <Icon className="size-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{a.label}</p>
                <p className="text-xs opacity-60">{a.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400" />Low Stock Alerts
            </h2>
            <button onClick={() => router.push('/dashboard/inventory/items?status=low_stock')} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all</button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(data?.low_stock_items ?? []).length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">All stock levels are healthy ✓</div>
            ) : (
              (data?.low_stock_items ?? []).slice(0, 6).map((p: {
                id: string;
                name: string;
                item_code: string;
                current_stock: number;
                reorder_level: number;
              }) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm text-white font-medium">{p.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{p.item_code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', p.current_stock <= 0 ? 'text-red-400' : 'text-amber-400')}>
                        {p.current_stock}
                      </p>
                      <p className="text-[10px] text-zinc-600">/ {p.reorder_level} min</p>
                    </div>
                    <StockBadge current={p.current_stock} reorderLevel={p.reorder_level} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Recent Movements</h2>
            <button onClick={() => router.push('/dashboard/inventory/adjustments')} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all</button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(data?.recent_movements ?? []).length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No movements yet</div>
            ) : (
              (data?.recent_movements ?? []).slice(0, 8).map((m: {
                id: string;
                product: { name: string; item_code: string };
                type: string;
                quantity: number;
                balance: number;
                created_at: string;
              }) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <MovementTypeBadge type={m.type} />
                    <div>
                      <p className="text-sm text-white">{m.product.name}</p>
                      <p className="text-xs text-zinc-600">{fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-semibold', m.quantity > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </p>
                    <p className="text-xs text-zinc-600">bal: {m.balance}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
