'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { StockMovementTable } from '@/components/inventory/StockMovementTable';

export const dynamic = 'force-dynamic';

export default function StockMovementsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
          <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
          <span>/</span>
          <span className="text-zinc-400">Stock Movements</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="size-5 text-emerald-400" />
          </div>
          Stock Movements
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Full history of all stock ins, outs and adjustments</p>
      </div>

      <StockMovementTable />
    </div>
  );
}
