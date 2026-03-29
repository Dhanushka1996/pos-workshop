'use client';

import { useState } from 'react';
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { useStockMovements, useStockAdjustment } from '@/hooks/inventory/useStockMovements';
import { useProducts } from '@/hooks/inventory/useProducts';
import { MovementTypeBadge } from '@/components/inventory/StockBadge';
import { Modal } from '@/components/ui/Modal';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/types/inventory';

export const dynamic = 'force-dynamic';

const ADJUST_TYPES = [
  { value: 'ADJUSTMENT', label: 'Adjustment (Manual)', dir: 'both', color: 'text-amber-400' },
  { value: 'DISPATCH',   label: 'Dispatch / Usage',   dir: 'out',  color: 'text-orange-400' },
  { value: 'RETURN',     label: 'Return / Restore',   dir: 'in',   color: 'text-teal-400' },
  { value: 'OPENING',    label: 'Opening Stock',      dir: 'in',   color: 'text-zinc-400' },
];

export default function AdjustmentsPage() {
  const [open, setOpen]             = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [search, setSearch]         = useState('');
  const [adjType, setAdjType]       = useState('ADJUSTMENT');
  const [qty, setQty]               = useState('');
  const [notes, setNotes]           = useState('');
  const [reference, setReference]   = useState('');
  const [error, setError]           = useState('');

  const { data: movData, isLoading: movLoading, refetch } = useStockMovements({ page: 1 });
  const { data: productsData }   = useProducts({ search: search, limit: 15 });
  const adjustMutation           = useStockAdjustment();

  const movements = movData ?? [];
  const products: ProductType[] = (productsData?.products ?? []) as unknown as ProductType[];

  const { fmt }  = useCurrency();
  const fmtDate  = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleSubmit = async () => {
    if (!selectedProduct) { setError('Select a product first.'); return; }
    if (!qty || parseFloat(qty) <= 0) { setError('Enter a valid quantity.'); return; }
    setError('');
    try {
      await adjustMutation.mutateAsync({
        product_id: selectedProduct.id,
        type:       adjType as 'ADJUSTMENT' | 'DISPATCH' | 'RETURN' | 'OPENING',
        quantity:   parseFloat(qty),
        notes:      notes || undefined,
        reference:  reference || undefined,
      });
      setOpen(false);
      setSelectedProduct(null);
      setQty('');
      setNotes('');
      setReference('');
      refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Adjustment failed');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-semibold text-white">Stock Movements</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Full history of every stock change</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all"
          >
            <RefreshCw className="size-4" />Stock Adjustment
          </button>
        </div>
      </div>

      {/* Movement log */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="bg-zinc-900/90 backdrop-blur border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Qty Change</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {movLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-zinc-500 text-sm">No stock movements yet</td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white text-sm">{m.product.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{m.product.item_code}</p>
                  </td>
                  <td className="px-4 py-3"><MovementTypeBadge type={m.type} /></td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-semibold tabular-nums', m.quantity > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{m.balance}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{m.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{m.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">{fmtDate(m.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Adjustment Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Stock Adjustment"
        size="md"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={adjustMutation.isPending}
              className="px-5 py-2 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium transition-all disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Processing…' : 'Apply Adjustment'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Product search */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Product <span className="text-red-400">*</span></label>
            {selectedProduct ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30">
                <div>
                  <p className="text-sm font-medium text-white">{selectedProduct.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{selectedProduct.item_code} · Stock: {selectedProduct.current_stock}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-white transition-colors text-xs">Change</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search product name or code…"
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                {products.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-zinc-800 overflow-hidden max-h-40 overflow-y-auto">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setSearch(''); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm text-white">{p.name}</span>
                        <span className="text-xs text-zinc-500 font-mono">{p.item_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUST_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAdjType(t.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left',
                    adjType === t.value
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20'
                  )}
                >
                  {t.dir === 'in'  ? <ArrowUpCircle className="size-4 text-emerald-400 flex-shrink-0" />  :
                   t.dir === 'out' ? <ArrowDownCircle className="size-4 text-red-400 flex-shrink-0" />    :
                                     <RefreshCw className="size-4 text-amber-400 flex-shrink-0" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Qty, reference, notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Quantity <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Reference</label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. ADJ-001"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for adjustment…"
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
