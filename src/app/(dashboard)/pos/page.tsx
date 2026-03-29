'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Trash2, CreditCard, Clock, X, RefreshCw,
  Keyboard, Receipt, AlertCircle, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { PaymentModal }     from '@/components/pos/PaymentModal';
import { InvoiceModal }     from '@/components/pos/InvoiceModal';
import { HeldSalesDrawer }  from '@/components/pos/HeldSalesDrawer';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SearchProduct {
  id:            string;
  item_code:     string;
  name:          string;
  retail_price:  number;
  cost_price:    number;
  current_stock: number;
  track_stock:   boolean;
  min_price:     number;
  category:      { name: string } | null;
}

export interface CartItem {
  product_id: string;
  item_code:  string;
  name:       string;
  unit_price: number;
  cost_price: number;
  quantity:   number;
  discount:   number;  // per-line discount amount
  stock:      number;
  track_stock:boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function POSPage() {
  const { fmt } = useCurrency();
  const searchRef = useRef<HTMLInputElement>(null);

  // Search
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchProduct[]>([]);
  const [resultIdx,  setResultIdx]  = useState(-1);
  const [searching,  setSearching]  = useState(false);

  // Cart
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [stockError,   setStockError]   = useState('');

  // UI
  const [showPayment,  setShowPayment]  = useState(false);
  const [showInvoice,  setShowInvoice]  = useState(false);
  const [showHeld,     setShowHeld]     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastSale,     setLastSale]     = useState<any>(null);

  // ── Derived totals ─────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0);
  const total    = Math.max(0, subtotal - cartDiscount);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Product search (debounced 150 ms) ─────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); setResultIdx(-1); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/pos/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) { setResults(await res.json()); setResultIdx(-1); }
      } finally { setSearching(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  // ── Add to cart ────────────────────────────────────────────────────
  const addToCart = useCallback((product: SearchProduct) => {
    setStockError('');
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);

      if (existing) {
        const newQty = existing.quantity + 1;
        if (product.track_stock && newQty > product.current_stock) {
          setStockError(`Only ${product.current_stock} in stock for "${product.name}"`);
          return prev;
        }
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: newQty } : i,
        );
      }

      if (product.track_stock && product.current_stock <= 0) {
        setStockError(`"${product.name}" is out of stock`);
        return prev;
      }

      return [...prev, {
        product_id:  product.id,
        item_code:   product.item_code,
        name:        product.name,
        unit_price:  product.retail_price,
        cost_price:  product.cost_price,
        quantity:    1,
        discount:    0,
        stock:       product.current_stock,
        track_stock: product.track_stock,
      }];
    });

    setQuery('');
    setResults([]);
    searchRef.current?.focus();
  }, []);

  // ── Cart mutations ─────────────────────────────────────────────────
  const updateQty = (product_id: string, qty: number) => {
    if (qty <= 0) { removeItem(product_id); return; }
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      if (i.track_stock && qty > i.stock) {
        setStockError(`Only ${i.stock} in stock for "${i.name}"`);
        return i;
      }
      setStockError('');
      return { ...i, quantity: qty };
    }));
  };

  const updatePrice    = (id: string, v: number) =>
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, unit_price: Math.max(0, v) } : i));

  const updateDiscount = (id: string, v: number) =>
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, discount: Math.max(0, v) } : i));

  const removeItem = (id: string) =>
    setCart(prev => prev.filter(i => i.product_id !== id));

  const clearCart = useCallback(() => {
    setCart([]);
    setCartDiscount(0);
    setStockError('');
    setQuery('');
    setResults([]);
    searchRef.current?.focus();
  }, []);

  // ── Hold cart ──────────────────────────────────────────────────────
  const holdCart = async () => {
    if (!cart.length) return;
    await fetch('/api/pos/held', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        label:     `Hold · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        cart_data: JSON.stringify({ cart, cartDiscount }),
      }),
    });
    clearCart();
  };

  // ── Resume held ────────────────────────────────────────────────────
  const resumeHeld = (cartData: string) => {
    try {
      const { cart: savedCart, cartDiscount: savedDiscount } = JSON.parse(cartData);
      setCart(savedCart ?? []);
      setCartDiscount(savedDiscount ?? 0);
    } catch { /* ignore */ }
    setShowHeld(false);
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F2 → focus search
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); return; }

      // F4 → pay
      if (e.key === 'F4') { e.preventDefault(); if (cart.length) setShowPayment(true); return; }

      // Escape
      if (e.key === 'Escape') {
        if (showPayment) { setShowPayment(false); return; }
        if (showInvoice) { setShowInvoice(false); return; }
        if (showHeld)    { setShowHeld(false); return; }
        if (results.length) { setQuery(''); setResults([]); return; }
        return;
      }

      // Arrow navigation in results
      if (results.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setResultIdx(i => Math.min(i + 1, results.length - 1)); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setResultIdx(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          const idx = resultIdx >= 0 ? resultIdx : 0;
          if (results[idx]) addToCart(results[idx]);
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, results, resultIdx, showPayment, showInvoice, showHeld, addToCart]);

  // Auto-focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden select-none">

      {/* ── LEFT: Search panel ───────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/[0.06]">

        {/* Search input */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setStockError(''); }}
              placeholder="Search item… (F2)"
              autoComplete="off"
              className="w-full pl-9 pr-8 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:border-brand-500/50 transition-colors"
            />
            {searching
              ? <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 animate-spin" />
              : query && <button onClick={() => { setQuery(''); setResults([]); searchRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded text-zinc-500 hover:text-white">
                  <X className="size-3.5" />
                </button>
            }
          </div>

          {/* Stock error */}
          {stockError && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-400 leading-tight">{stockError}</p>
            </div>
          )}
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2 space-y-0.5">
              {results.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={cn(
                    'w-full rounded-xl p-3 text-left transition-all group',
                    i === resultIdx
                      ? 'bg-brand-600/20 border border-brand-500/40'
                      : 'border border-transparent hover:bg-white/[0.05] hover:border-white/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-tight truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{p.item_code}</p>
                      {p.category && <p className="text-[10px] text-zinc-600 truncate">{p.category.name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-brand-400">{fmt(p.retail_price)}</p>
                      <p className={cn(
                        'text-[10px] font-medium mt-0.5',
                        !p.track_stock           ? 'text-zinc-500'
                        : p.current_stock > 5    ? 'text-emerald-400'
                        : p.current_stock > 0    ? 'text-amber-400'
                        : 'text-red-400',
                      )}>
                        {!p.track_stock ? 'Service' : p.current_stock <= 0 ? 'Out of stock' : `${p.current_stock} in stock`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query && !searching ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <Package className="size-8 mb-2" />
              <p className="text-sm">No products found</p>
              <p className="text-xs text-zinc-700 mt-1">Try a different name or code</p>
            </div>
          ) : !query ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
              <Keyboard className="size-8 mb-2" />
              <p className="text-xs text-center px-4">Type a product name, code,<br />or scan a barcode</p>
            </div>
          ) : null}
        </div>

        {/* Held sales button */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setShowHeld(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all"
          >
            <Clock className="size-3.5" />
            Held Sales
          </button>
        </div>
      </div>

      {/* ── CENTER: Cart ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Cart header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Receipt className="size-4 text-zinc-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">Cart</h2>
              <p className="text-[11px] text-zinc-500">
                {cart.length === 0 ? 'Empty' : `${cart.length} line${cart.length !== 1 ? 's' : ''} · ${itemCount} unit${itemCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors">
              <X className="size-3.5" />Clear  <kbd className="text-[10px] bg-white/5 px-1 py-0.5 rounded">Esc</kbd>
            </button>
          )}
        </div>

        {/* Cart table */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700">
              <Receipt className="size-14 mb-3 text-zinc-800" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1 text-zinc-800">Search or scan a product to add it</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/[0.05]">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-zinc-500">Item</th>
                  <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 w-32">Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-500 w-28">Price</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-500 w-24">Disc</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-zinc-500 w-28">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {cart.map(item => {
                  const lineTotal = Math.max(0, item.quantity * item.unit_price - item.discount);
                  const overStock = item.track_stock && item.quantity > item.stock;

                  return (
                    <tr key={item.product_id} className="group hover:bg-white/[0.02] transition-colors">
                      {/* Name */}
                      <td className="px-5 py-3">
                        <p className="text-sm text-white font-medium leading-tight">{item.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.item_code}</p>
                        {overStock && (
                          <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="size-3" />Stock: {item.stock}
                          </p>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQty(item.product_id, item.quantity - 1)}
                            className="size-6 rounded-md flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-bold text-base leading-none"
                          >−</button>
                          <input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={e => updateQty(item.product_id, parseInt(e.target.value) || 1)}
                            className={cn(
                              'w-12 text-center bg-white/[0.04] border rounded-md text-sm text-white outline-none py-0.5 tabular-nums',
                              overStock ? 'border-red-500/50' : 'border-white/10 focus:border-brand-500/50',
                            )}
                          />
                          <button
                            onClick={() => updateQty(item.product_id, item.quantity + 1)}
                            className="size-6 rounded-md flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-bold text-base leading-none"
                          >+</button>
                        </div>
                      </td>

                      {/* Unit price */}
                      <td className="px-3 py-3">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unit_price}
                          onChange={e => updatePrice(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-white/[0.04] border border-white/10 rounded-md text-sm text-white outline-none focus:border-brand-500/50 py-0.5 px-2 tabular-nums"
                        />
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-3">
                        <input
                          type="number" min="0" step="1"
                          value={item.discount || ''}
                          placeholder="0"
                          onChange={e => updateDiscount(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-white/[0.04] border border-white/10 rounded-md text-sm text-amber-400 outline-none focus:border-amber-500/50 py-0.5 px-2 tabular-nums placeholder:text-zinc-700"
                        />
                      </td>

                      {/* Line total */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-white tabular-nums">{fmt(lineTotal)}</span>
                      </td>

                      {/* Delete */}
                      <td className="py-3 pr-3">
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="size-6 rounded-md flex items-center justify-center text-transparent group-hover:text-zinc-600 hover:!text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── RIGHT: Summary + actions ─────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-l border-white/[0.06] bg-zinc-950/40">

        {/* Totals */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-3">Order Summary</p>

            {/* Item list preview */}
            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-xs text-zinc-700 text-center py-4">No items</p>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-zinc-500 truncate flex-1">{item.name}</p>
                    <p className="text-[11px] text-zinc-400 flex-shrink-0 tabular-nums">
                      ×{item.quantity} {fmt(item.quantity * item.unit_price - item.discount)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Totals breakdown */}
            <div className="border-t border-white/[0.06] pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-white tabular-nums">{fmt(subtotal)}</span>
              </div>

              {/* Cart-level discount */}
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-zinc-400 flex-shrink-0">Discount</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" step="1"
                    value={cartDiscount || ''}
                    placeholder="0"
                    onChange={e => setCartDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 text-right bg-white/[0.04] border border-white/10 rounded-md text-sm text-amber-400 outline-none focus:border-amber-500/50 py-0.5 px-2 tabular-nums placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Grand total */}
              <div className="border-t border-white/[0.06] pt-2 mt-1 flex justify-between items-center">
                <span className="text-base font-bold text-white">TOTAL</span>
                <span className="text-2xl font-bold text-brand-400 tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          {/* PAY */}
          <button
            onClick={() => cart.length > 0 && setShowPayment(true)}
            disabled={cart.length === 0}
            className={cn(
              'w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2.5',
              cart.length > 0
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 active:scale-[0.98]'
                : 'bg-white/[0.05] text-zinc-600 cursor-not-allowed',
            )}
          >
            <CreditCard className="size-5" />
            PAY
            <kbd className="text-[11px] font-normal opacity-60 bg-white/15 px-1.5 py-0.5 rounded">F4</kbd>
          </button>

          {/* Hold + Clear */}
          <div className="flex gap-2">
            <button
              onClick={holdCart}
              disabled={cart.length === 0}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Clock className="size-4" />Hold
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="size-4" />Clear
            </button>
          </div>

          {/* Shortcut hints */}
          <p className="text-center text-[10px] text-zinc-700 pt-1">
            F2 Search&nbsp;·&nbsp;F4 Pay&nbsp;·&nbsp;Esc Close
          </p>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showPayment && (
        <PaymentModal
          cart={cart}
          subtotal={subtotal}
          cartDiscount={cartDiscount}
          total={total}
          onClose={() => setShowPayment(false)}
          onSuccess={sale => {
            setLastSale(sale);
            setShowPayment(false);
            setShowInvoice(true);
            clearCart();
          }}
        />
      )}

      {showInvoice && lastSale && (
        <InvoiceModal
          sale={lastSale}
          onClose={() => { setShowInvoice(false); searchRef.current?.focus(); }}
        />
      )}

      {showHeld && (
        <HeldSalesDrawer
          onClose={() => setShowHeld(false)}
          onResume={resumeHeld}
        />
      )}
    </div>
  );
}
