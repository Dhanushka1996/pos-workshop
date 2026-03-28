'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Banknote, RefreshCw, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface CartItem {
  product_id: string;
  item_code:  string;
  name:       string;
  unit_price: number;
  cost_price: number;
  quantity:   number;
  discount:   number;
  stock:      number;
}

interface Props {
  cart:         CartItem[];
  subtotal:     number;
  cartDiscount: number;
  total:        number;
  onClose:      () => void;
  onSuccess:    (sale: unknown) => void;
}

type PayMethod = 'cash' | 'card' | 'mixed';

export function PaymentModal({ cart, subtotal, cartDiscount, total, onClose, onSuccess }: Props) {
  const { fmt } = useCurrency();
  const cashRef = useRef<HTMLInputElement>(null);

  const [method,    setMethod]    = useState<PayMethod>('cash');
  const [cash,      setCash]      = useState<string>(String(total));
  const [card,      setCard]      = useState<string>('0');
  const [cardRef,   setCardRef]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [processing,setProcessing]= useState(false);
  const [error,     setError]     = useState('');

  const cashNum    = parseFloat(cash)  || 0;
  const cardNum    = parseFloat(card)  || 0;
  const totalPaid  = method === 'cash'  ? cashNum
                   : method === 'card'  ? cardNum
                   : cashNum + cardNum;
  const change     = method === 'cash' || method === 'mixed' ? Math.max(0, totalPaid - total) : 0;
  const balance    = totalPaid - total;
  const isBalanced = method === 'mixed' ? Math.abs(balance) < 0.01 : totalPaid >= total;

  // Auto-fill cash to total when switching method
  useEffect(() => {
    if (method === 'cash')  { setCash(String(total)); setCard('0'); }
    if (method === 'card')  { setCard(String(total)); setCash('0'); }
    if (method === 'mixed') { setCash(''); setCard(''); }
  }, [method, total]);

  // Focus cash input on open
  useEffect(() => { setTimeout(() => cashRef.current?.focus(), 50); }, []);

  // Enter key confirms payment
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isBalanced && !processing) handlePay();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBalanced, processing]);

  const handlePay = async () => {
    if (!isBalanced || processing) return;
    setError('');
    setProcessing(true);

    const payments = method === 'cash'
      ? [{ method: 'cash', amount: cashNum }]
      : method === 'card'
      ? [{ method: 'card', amount: cardNum, reference: cardRef || undefined }]
      : [
          { method: 'cash', amount: cashNum },
          { method: 'card', amount: cardNum, reference: cardRef || undefined },
        ].filter(p => p.amount > 0);

    const body = {
      items: cart.map(i => ({
        product_id: i.product_id,
        quantity:   i.quantity,
        unit_price: i.unit_price,
        cost_price: i.cost_price,
        discount:   i.discount,
        total:      Math.max(0, i.quantity * i.unit_price - i.discount),
      })),
      payments,
      subtotal,
      discount:     cartDiscount,
      tax:          0,
      total,
      paid_amount:  totalPaid,
      change_amount:change,
      payment_type: method,
      notes: notes || undefined,
    };

    try {
      const res  = await fetch('/api/pos/sales', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed');
      onSuccess(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
      setProcessing(false);
    }
  };

  const METHOD_TABS: { key: PayMethod; label: string; icon: React.ElementType }[] = [
    { key: 'cash',  label: 'Cash',  icon: Banknote    },
    { key: 'card',  label: 'Card',  icon: CreditCard  },
    { key: 'mixed', label: 'Mixed', icon: Layers       },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white text-lg">Payment</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Amount due */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-sm text-zinc-400">Amount Due</span>
            <span className="text-3xl font-bold text-white tabular-nums">{fmt(total)}</span>
          </div>

          {/* Method tabs */}
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-2">Payment Method</p>
            <div className="flex gap-2">
              {METHOD_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    method === key
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]',
                  )}
                >
                  <Icon className="size-4" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash field */}
          {(method === 'cash' || method === 'mixed') && (
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">
                {method === 'mixed' ? 'Cash Amount' : 'Cash Received'}
              </label>
              <input
                ref={cashRef}
                type="number"
                min="0"
                step="1"
                value={cash}
                onChange={e => setCash(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-xl font-bold text-white text-right outline-none focus:border-brand-500/70 tabular-nums"
              />
            </div>
          )}

          {/* Card field */}
          {(method === 'card' || method === 'mixed') && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 block">Card Amount</label>
              <input
                type="number"
                min="0"
                step="1"
                value={card}
                onChange={e => setCard(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-xl font-bold text-white text-right outline-none focus:border-brand-500/70 tabular-nums"
              />
              <input
                type="text"
                placeholder="Card reference / approval code (optional)"
                value={cardRef}
                onChange={e => setCardRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-brand-500/50"
              />
            </div>
          )}

          {/* Change / balance row */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06]">
            {method === 'cash' || method === 'mixed' ? (
              <>
                <span className="text-sm text-zinc-400">Change</span>
                <span className={cn('text-xl font-bold tabular-nums', change > 0 ? 'text-emerald-400' : 'text-zinc-600')}>
                  {fmt(change)}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm text-zinc-400">Balance</span>
                <span className={cn('text-xl font-bold tabular-nums', isBalanced ? 'text-emerald-400' : 'text-red-400')}>
                  {fmt(Math.abs(balance))} {balance < 0 ? 'short' : balance > 0 ? 'over' : ''}
                </span>
              </>
            )}
          </div>

          {/* Notes */}
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-brand-500/50"
          />

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handlePay}
            disabled={!isBalanced || processing}
            className={cn(
              'w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-3',
              isBalanced && !processing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed',
            )}
          >
            {processing
              ? <><RefreshCw className="size-5 animate-spin" />Processing…</>
              : <><CheckCircle2 className="size-5" />Confirm Payment<kbd className="text-xs font-normal opacity-60 bg-white/10 px-2 py-0.5 rounded ml-2">Enter</kbd></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
