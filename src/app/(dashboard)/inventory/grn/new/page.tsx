'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Search, Check, Wrench,
  FileText, ChevronRight, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useCreateGRN } from '@/hooks/inventory/useStockMovements';
import { useProducts }   from '@/hooks/inventory/useProducts';
import { useSuppliers }  from '@/hooks/inventory/useSuppliers';
import { useCurrency }   from '@/hooks/useCurrency';
import { cn }            from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface LineItem {
  product_id:   string;
  product_name: string;
  item_code:    string;
  product_type: string;
  quantity:     number;
  cost_price:   number;
  total:        number;
}

interface CreatedAssembly {
  id:           string;
  ref_number:   string;
  product_name: string;
}

export default function NewGRNPage() {
  const router = useRouter();
  const { fmt } = useCurrency();

  const [supplierId,     setSupplierId]     = useState('');
  const [invoiceNumber,  setInvoiceNumber]  = useState('');
  const [receivedDate,   setReceivedDate]   = useState('');
  const [notes,          setNotes]          = useState('');
  const [lines,          setLines]          = useState<LineItem[]>([]);
  const [search,         setSearch]         = useState('');
  const [error,          setError]          = useState('');
  const [step,           setStep]           = useState<'form' | 'success'>('form');
  const [createdGRN,     setCreatedGRN]     = useState<{ id: string; grn_number: string } | null>(null);
  const [createdAsms,    setCreatedAsms]    = useState<CreatedAssembly[]>([]);

  const { data: productsData } = useProducts({ search, limit: 20 });
  const { data: suppliers }    = useSuppliers();
  const createGRN              = useCreateGRN();

  const products = productsData?.products ?? [];

  const addLine = useCallback((p: { id: string; name: string; item_code: string; product_type: string; cost_price: number }) => {
    if (lines.some(l => l.product_id === p.id)) return;
    setLines(prev => [...prev, {
      product_id:   p.id,
      product_name: p.name,
      item_code:    p.item_code,
      product_type: p.product_type,
      quantity:     1,
      cost_price:   p.cost_price,
      total:        p.cost_price,
    }]);
    setSearch('');
  }, [lines]);

  const updateLine = (index: number, field: 'quantity' | 'cost_price', value: number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      updated.total = updated.quantity * updated.cost_price;
      return updated;
    }));
  };

  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index));

  const grandTotal  = lines.reduce((sum, l) => sum + l.total, 0);
  const assemblyLines = lines.filter(l => l.product_type === 'ASSEMBLY');

  const handleSubmit = async () => {
    if (lines.length === 0) { setError('Add at least one item.'); return; }
    setError('');
    try {
      const result = await createGRN.mutateAsync({
        supplier_id:    supplierId   || undefined,
        invoice_number: invoiceNumber || undefined,
        received_date:  receivedDate  || undefined,
        notes:          notes         || undefined,
        items: lines.map(l => ({
          product_id: l.product_id,
          quantity:   l.quantity,
          cost_price: l.cost_price,
          total:      l.total,
        })),
      } as Parameters<typeof createGRN.mutateAsync>[0]);

      const res = result as { id: string; grn_number: string; assembliesCreated?: CreatedAssembly[] };
      setCreatedGRN({ id: res.id, grn_number: res.grn_number });
      setCreatedAsms(res.assembliesCreated ?? []);
      setStep('success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create GRN');
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (step === 'success' && createdGRN) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">GRN Created Successfully</h2>
          <p className="text-sm text-zinc-500 mt-1">
            <span className="font-mono text-brand-400">{createdGRN.grn_number}</span> has been confirmed and stock updated.
          </p>
        </div>

        {createdAsms.length > 0 && (
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="size-4 text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">
                {createdAsms.length} Assembly record{createdAsms.length !== 1 ? 's' : ''} auto-created
              </p>
            </div>
            <div className="space-y-2">
              {createdAsms.map(asm => (
                <div key={asm.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <p className="text-sm text-white font-medium">{asm.product_name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{asm.ref_number}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/inventory/assemblies/${asm.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all font-medium"
                  >
                    Setup Components <ChevronRight className="size-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-400/60 mt-3">
              Define what components each assembly contains to enable dismantling.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/inventory/grn/${createdGRN.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <FileText className="size-4" /> View GRN
          </button>
          <button
            onClick={() => {
              setStep('form');
              setLines([]);
              setSupplierId('');
              setInvoiceNumber('');
              setReceivedDate('');
              setNotes('');
              setCreatedGRN(null);
              setCreatedAsms([]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="size-4" /> New GRN
          </button>
          <button
            onClick={() => router.push('/inventory/grn')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-all"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  // ── Form screen ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.push('/inventory/grn')}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">New Goods Received Note</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Receive stock from supplier · Assembly items will auto-create dismantle records
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Item Search */}
        <div className="w-72 border-r border-white/[0.06] flex flex-col bg-zinc-950/30 flex-shrink-0">
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Search Items</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or code…"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {products.map(p => {
              const added = lines.some(l => l.product_id === p.id);
              const isAsm = p.product_type === 'ASSEMBLY';
              return (
                <button
                  key={p.id}
                  onClick={() => addLine(p)}
                  disabled={added}
                  className={cn(
                    'w-full flex items-start justify-between px-4 py-3 text-left transition-colors',
                    added ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm text-white font-medium leading-tight truncate">{p.name}</p>
                      {isAsm && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
                          <Wrench className="size-2.5" />ASM
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{p.item_code}</p>
                  </div>
                  {added
                    ? <Check className="size-4 text-emerald-400 mt-1 flex-shrink-0" />
                    : <Plus className="size-4 text-zinc-500 mt-1 flex-shrink-0" />
                  }
                </button>
              );
            })}
            {search && products.length === 0 && (
              <p className="text-center text-zinc-600 text-xs py-6">No items found</p>
            )}
          </div>
        </div>

        {/* Right panel — GRN form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* GRN header fields */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Supplier</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                >
                  <option value="">— No Supplier —</option>
                  {(suppliers ?? []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Invoice Number</label>
                <input
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2025-001"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Received Date</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Notes</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {assemblyLines.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <Wrench className="size-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  <span className="font-semibold">{assemblyLines.length} assembly item{assemblyLines.length !== 1 ? 's' : ''}</span>
                  {' '}in this GRN — Assembly records will be auto-created for dismantling
                </p>
              </div>
            )}
          </div>

          {/* Line items table */}
          <div className="flex-1 overflow-auto">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
                <Search className="size-12 text-zinc-800" />
                <p className="text-sm">Search and add items from the left panel</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-zinc-900/90 backdrop-blur border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">Cost Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Total</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {lines.map((line, i) => (
                    <tr key={line.product_id} className="group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {line.product_type === 'ASSEMBLY' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
                              <Wrench className="size-2.5" />ASM
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-white">{line.product_name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{line.item_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min="0.01" step="0.01"
                          value={line.quantity}
                          onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white text-right focus:outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.cost_price}
                          onChange={e => updateLine(i, 'cost_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white text-right focus:outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">
                        {fmt(line.total)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeLine(i)} className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] bg-zinc-900/50 flex items-center justify-between">
            <div className="space-y-1">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="size-3.5" />{error}
                </div>
              )}
              <p className="text-xs text-zinc-500">{lines.length} item{lines.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-zinc-500">Grand Total</p>
                <p className="text-xl font-bold text-white tabular-nums">{fmt(grandTotal)}</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={createGRN.isPending || lines.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {createGRN.isPending
                  ? <><RefreshCw className="size-4 animate-spin" />Processing…</>
                  : 'Confirm GRN'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
