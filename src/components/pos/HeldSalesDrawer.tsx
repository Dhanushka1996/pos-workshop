'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Trash2, RefreshCw, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface HeldSale {
  id:         string;
  label:      string | null;
  cart_data:  string;
  created_at: string;
}

interface Props {
  onClose:  () => void;
  onResume: (cartData: string, id: string) => void;
}

export function HeldSalesDrawer({ onClose, onResume }: Props) {
  const [held,    setHeld]    = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting,setDeleting]= useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pos/held');
      setHeld(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/pos/held/${id}`, { method: 'DELETE' });
    setHeld(prev => prev.filter(h => h.id !== id));
    setDeleting(null);
  };

  const handleResume = async (h: HeldSale) => {
    onResume(h.cart_data, h.id);
    await fetch(`/api/pos/held/${h.id}`, { method: 'DELETE' });
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-400" />
            <h2 className="font-semibold text-white">Held Sales</h2>
            {held.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {held.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="size-5 text-zinc-600 animate-spin" />
            </div>
          ) : held.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Clock className="size-8 mb-2" />
              <p className="text-sm">No held sales</p>
            </div>
          ) : (
            <div className="space-y-2">
              {held.map(h => {
                let cartInfo = { itemCount: 0, total: '—' };
                try {
                  const parsed = JSON.parse(h.cart_data);
                  const items  = parsed.cart ?? [];
                  cartInfo = {
                    itemCount: items.length,
                    total: items.reduce((s: number, i: { quantity: number; unit_price: number; discount: number }) =>
                      s + i.quantity * i.unit_price - i.discount, 0).toFixed(2),
                  };
                } catch { /* ignore */ }

                return (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{h.label ?? 'Held Sale'}</p>
                      <p className="text-[11px] text-zinc-500">
                        {cartInfo.itemCount} item{cartInfo.itemCount !== 1 ? 's' : ''} · {fmtDate(h.created_at)} {fmtTime(h.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleResume(h)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-400 hover:bg-brand-600/30 text-xs font-medium transition-all"
                      >
                        <Play className="size-3" />Resume
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={deleting === h.id}
                        className="size-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        {deleting === h.id
                          ? <RefreshCw className="size-3.5 animate-spin" />
                          : <Trash2 className="size-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
