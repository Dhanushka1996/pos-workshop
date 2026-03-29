'use client';

import { useRef } from 'react';
import { X, Printer, ShoppingBag } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

export const dynamic = 'force-dynamic';

interface SaleItem {
  id:        string;
  quantity:  number;
  unit_price:number;
  discount:  number;
  total:     number;
  product:   { name: string; item_code: string };
}

interface SalePayment {
  method:    string;
  amount:    number;
  reference: string | null;
}

interface Sale {
  id:           string;
  sale_number:  string;
  subtotal:     number;
  discount:     number;
  tax:          number;
  total:        number;
  paid_amount:  number;
  change_amount:number;
  payment_type: string;
  created_at:   string;
  items:        SaleItem[];
  payments:     SalePayment[];
}

interface Props {
  sale:    Sale;
  onClose: () => void;
}

export function InvoiceModal({ sale, onClose }: Props) {
  const { fmt } = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Invoice ${sale.sale_number}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .hr { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .right { text-align: right; }
        .big { font-size: 16px; font-weight: bold; }
        .small { font-size: 10px; color: #555; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="font-semibold text-white">Invoice</h2>
            <p className="text-xs text-emerald-400 font-mono">{sale.sale_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all"
            >
              <Printer className="size-3.5" />Print
            </button>
            <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Invoice body (screen version) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Date */}
          <p className="text-xs text-zinc-500 text-center">{fmtDate(sale.created_at)}</p>

          {/* Items */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Items</p>
            {sale.items.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.product.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{item.product.item_code} × {item.quantity} @ {fmt(item.unit_price)}</p>
                  {item.discount > 0 && <p className="text-[10px] text-amber-400">− {fmt(item.discount)} disc</p>}
                </div>
                <p className="text-sm font-semibold text-white flex-shrink-0">{fmt(item.total)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white">{fmt(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Discount</span>
                <span className="text-amber-400">− {fmt(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Tax</span>
                <span className="text-white">{fmt(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-white/[0.06] pt-2 mt-2">
              <span className="text-white">TOTAL</span>
              <span className="text-emerald-400">{fmt(sale.total)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="border-t border-white/[0.06] pt-3 space-y-1">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Payment</p>
            {sale.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-400 capitalize">{p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                <span className="text-white">{fmt(p.amount)}</span>
              </div>
            ))}
            {sale.change_amount > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Change</span>
                <span>{fmt(sale.change_amount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Print-only content (hidden from screen) */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="center bold" style={{ fontSize: 14 }}>POS Workshop</div>
          <div className="center small">{fmtDate(sale.created_at)}</div>
          <div className="center small">Invoice: {sale.sale_number}</div>
          <div className="hr" />
          <table>
            <tbody>
              {sale.items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="bold">{item.product.name}</div>
                    <div className="small">{item.quantity} × {fmt(item.unit_price)}{item.discount > 0 ? ` − ${fmt(item.discount)}` : ''}</div>
                  </td>
                  <td className="right bold">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hr" />
          <table><tbody>
            <tr><td>Subtotal</td><td className="right">{fmt(sale.subtotal)}</td></tr>
            {sale.discount > 0 && <tr><td>Discount</td><td className="right">− {fmt(sale.discount)}</td></tr>}
            {sale.tax > 0 && <tr><td>Tax</td><td className="right">{fmt(sale.tax)}</td></tr>}
          </tbody></table>
          <div className="hr" />
          <table><tbody>
            <tr><td className="big">TOTAL</td><td className="right big">{fmt(sale.total)}</td></tr>
          </tbody></table>
          <div className="hr" />
          {sale.payments.map((p, i) => (
            <table key={i}><tbody>
              <tr>
                <td style={{ textTransform: 'capitalize' }}>{p.method}{p.reference ? ` (${p.reference})` : ''}</td>
                <td className="right">{fmt(p.amount)}</td>
              </tr>
            </tbody></table>
          ))}
          {sale.change_amount > 0 && <table><tbody><tr><td>Change</td><td className="right">{fmt(sale.change_amount)}</td></tr></tbody></table>}
          <div className="hr" />
          <div className="center small">Thank you for your business!</div>
        </div>

        {/* New sale button */}
        <div className="px-5 pb-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="size-4" />New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
