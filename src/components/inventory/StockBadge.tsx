'use client';
import { cn } from '@/lib/utils';
import { getStockStatus } from '@/types/inventory';

interface StockBadgeProps {
  current:      number;
  reorderLevel: number;
  className?:   string;
}

export function StockBadge({ current, reorderLevel, className }: StockBadgeProps) {
  const status = getStockStatus(current, reorderLevel);
  const config = {
    in_stock:     { label: 'In Stock',     dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    low_stock:    { label: 'Low Stock',    dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    out_of_stock: { label: 'Out of Stock', dot: 'bg-red-400',     badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border', config.badge, className)}>
      <span className={cn('size-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

export function MovementTypeBadge({ type }: { type: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    GRN:        { label: 'GRN',        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    SALE:       { label: 'Sale',       cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    ADJUSTMENT: { label: 'Adjustment', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    DISPATCH:   { label: 'Dispatch',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    RETURN:     { label: 'Return',     cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    TRANSFER:   { label: 'Transfer',   cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    OPENING:    { label: 'Opening',    cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  };
  const c = configs[type] ?? { label: type, cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium border', c.cls)}>{c.label}</span>
  );
}
