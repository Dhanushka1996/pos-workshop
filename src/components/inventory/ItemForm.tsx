'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, DollarSign, Package, Layers,
  Plus, Trash2, RefreshCw, Barcode,
  Save, X, ArrowRight, AlertCircle, ToggleLeft, ToggleRight,
  CheckCircle2,
} from 'lucide-react';
import { productSchema, type ProductInput } from '@/lib/validations/inventory';
import { useCategories, useCreateCategory, useCreateSubCategory, useUOMs } from '@/hooks/inventory/useCategories';
import { useBrands, useCreateBrand } from '@/hooks/inventory/useBrands';
import { useSuppliers } from '@/hooks/inventory/useSuppliers';
import { ComboBox } from '@/components/ui/ComboBox';
import { cn } from '@/lib/utils';
import { useCurrencyConfig } from '@/hooks/useSettings';
import { formatCurrency } from '@/lib/currency';
import type { ProductType, UOMType, CategoryType, SubCategoryType } from '@/types/inventory';

interface ItemFormProps {
  product?:   ProductType;
  onSubmit:   (data: ProductInput) => Promise<void>;
  onCancel:   () => void;
  isLoading?: boolean;
}

const TABS = [
  { id: 'general',   label: 'General',        icon: Info },
  { id: 'pricing',   label: 'Pricing',         icon: DollarSign },
  { id: 'inventory', label: 'Inventory',       icon: Package },
  { id: 'units',     label: 'Units & Barcode', icon: Layers },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Field wrapper ──────────────────────────────────────────────────────────────
function F({
  label, error, children, required, className,
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean; className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-medium text-zinc-400">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="size-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all';

// ── Price chain node ───────────────────────────────────────────────────────────
function PriceNode({ label, value, color, currencyStr }: { label: string; value: number; color: string; currencyStr: string }) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-3 rounded-xl border', color)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</span>
      <span className="text-base font-bold tabular-nums mt-0.5">
        {value > 0 ? currencyStr : '—'}
      </span>
    </div>
  );
}

// ── Toast chip ─────────────────────────────────────────────────────────────────
function ToastChip({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
      <CheckCircle2 className="size-3.5 flex-shrink-0" />{msg}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ItemForm({ product, onSubmit, onCancel, isLoading }: ItemFormProps) {
  const [activeTab,  setActiveTab]  = useState<TabId>('general');
  const [barcodes,   setBarcodes]   = useState<string[]>(product?.barcodes?.map(b => b.barcode) ?? []);
  const [newBarcode, setNewBarcode] = useState('');
  const [toast,      setToast]      = useState<string | null>(null);

  const { data: categories }  = useCategories();
  const { data: brands }      = useBrands();
  const { data: suppliers }   = useSuppliers();
  const { data: uoms }        = useUOMs();
  const currencyConfig        = useCurrencyConfig();
  const createCategoryMut     = useCreateCategory();
  const createSubCategoryMut  = useCreateSubCategory();
  const createBrandMut        = useCreateBrand();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      item_code:             product.item_code,
      name:                  product.name,
      description:           product.description ?? '',
      vehicle_compatibility: product.vehicle_compatibility ?? '',
      category_id:           product.category_id ?? '',
      sub_category_id:       product.sub_category_id ?? '',
      brand_id:              product.brand_id ?? '',
      supplier_id:           product.supplier_id ?? '',
      cost_price:            product.cost_price,
      retail_price:          product.retail_price,
      wholesale_price:       product.wholesale_price,
      min_price:             product.min_price,
      current_stock:         product.current_stock,
      reorder_level:         product.reorder_level,
      reorder_qty:           product.reorder_qty,
      track_stock:           product.track_stock ?? true,
      base_uom_id:           product.base_uom_id ?? '',
      bulk_uom_id:           product.bulk_uom_id ?? '',
      bulk_qty:              product.bulk_qty,
      bulk_cost_price:       product.bulk_cost_price,
      bulk_retail_price:     product.bulk_retail_price,
      is_active:             product.is_active,
      barcodes:              product.barcodes?.map(b => b.barcode) ?? [],
    } : { is_active: true, track_stock: true, barcodes: [] },
  });

  // Auto-generate item code on create
  useEffect(() => {
    if (!product) {
      fetch('/api/inventory/item-code/generate')
        .then(r => r.json())
        .then(d => setValue('item_code', d.item_code))
        .catch(() => {});
    }
  }, [product, setValue]);

  const watchedCategoryId = watch('category_id');
  const watchedCost       = watch('cost_price')      ?? 0;
  const watchedMin        = watch('min_price')        ?? 0;
  const watchedRetail     = watch('retail_price')     ?? 0;
  const watchedWholesale  = watch('wholesale_price')  ?? 0;
  const watchedTrack      = watch('track_stock');
  const watchedBulkQty    = watch('bulk_qty')         ?? 1;
  const watchedBaseUom    = watch('base_uom_id');
  const watchedBulkUom    = watch('bulk_uom_id');

  const subCategories: SubCategoryType[] =
    (categories as CategoryType[] ?? []).find(c => c.id === watchedCategoryId)?.sub_categories ?? [];

  const baseUomLabel = (uoms as UOMType[] ?? []).find(u => u.id === watchedBaseUom)?.abbreviation ?? 'unit';
  const bulkUomLabel = (uoms as UOMType[] ?? []).find(u => u.id === watchedBulkUom)?.abbreviation ?? 'pack';

  const fmt = (n: number) => formatCurrency(n, currencyConfig);

  // Price chain colours
  const costColor    = 'border-white/10 bg-white/[0.04] text-zinc-300';
  const minColor     = errors.min_price
    ? 'border-red-500/40 bg-red-500/5 text-red-400'
    : watchedMin > 0 && watchedCost > watchedMin
      ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
      : 'border-white/10 bg-white/[0.04] text-zinc-300';
  const retailColor  = errors.retail_price
    ? 'border-red-500/40 bg-red-500/5 text-red-400'
    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400';

  const markup = watchedCost > 0 && watchedRetail > 0
    ? (((watchedRetail - watchedCost) / watchedCost) * 100).toFixed(1)
    : null;
  const margin = watchedCost > 0 && watchedRetail > 0
    ? (((watchedRetail - watchedCost) / watchedRetail) * 100).toFixed(1)
    : null;

  // ── ComboBox create handlers ───────────────────────────────────────────────
  const handleCreateCategory = async (name: string): Promise<string> => {
    const result = await createCategoryMut.mutateAsync({ name });
    return result.id;
  };

  const handleCreateSubCategory = async (name: string): Promise<string> => {
    const catId = watchedCategoryId;
    if (!catId) throw new Error('Select a category first');
    const result = await createSubCategoryMut.mutateAsync({ name, category_id: catId });
    return result.id;
  };

  const handleCreateBrand = async (name: string): Promise<string> => {
    const result = await createBrandMut.mutateAsync({ name });
    return result.id;
  };

  // ── Barcodes ──────────────────────────────────────────────────────────────
  const handleGenerateBarcode = async () => {
    const res = await fetch('/api/inventory/barcode/generate');
    const d   = await res.json();
    setNewBarcode(d.barcode);
  };

  const addBarcode = () => {
    if (newBarcode && !barcodes.includes(newBarcode)) {
      const updated = [...barcodes, newBarcode];
      setBarcodes(updated);
      setValue('barcodes', updated);
      setNewBarcode('');
    }
  };

  const removeBarcode = (code: string) => {
    const updated = barcodes.filter(b => b !== code);
    setBarcodes(updated);
    setValue('barcodes', updated);
  };

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit({ ...data, barcodes });
  });

  const tabHasError = (id: TabId) => {
    if (id === 'general')   return !!(errors.item_code || errors.name);
    if (id === 'pricing')   return !!(errors.cost_price || errors.retail_price || errors.min_price || errors.wholesale_price);
    if (id === 'inventory') return !!(errors.current_stock || errors.reorder_level);
    return false;
  };

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col h-full">

      {/* ── Tabs ── */}
      <div className="flex gap-0.5 px-6 pt-4 border-b border-white/[0.06]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const bad  = tabHasError(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all',
                activeTab === tab.id
                  ? 'text-white border-brand-500 bg-white/[0.04]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.03]',
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {bad && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-400" />}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >

            {/* ════════ GENERAL ════════ */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-2 gap-5">
                <F label="Item Code" error={errors.item_code?.message} required>
                  <input {...register('item_code')} placeholder="ITM00001" className={inputCls} />
                </F>

                <F label="Status">
                  <Controller name="is_active" control={control} render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border text-sm transition-all',
                        field.value
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                          : 'border-white/10 bg-white/[0.04] text-zinc-500',
                      )}
                    >
                      {field.value ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                      {field.value ? 'Active' : 'Inactive'}
                    </button>
                  )} />
                </F>

                <div className="col-span-2">
                  <F label="Item Name" error={errors.name?.message} required>
                    <input {...register('name')} placeholder="e.g. Toyota Brake Pad Set — Front" className={inputCls} />
                  </F>
                </div>

                {/* Category — searchable + creatable */}
                <F label="Category">
                  <Controller name="category_id" control={control} render={({ field }) => (
                    <ComboBox
                      options={(categories as CategoryType[] ?? []).map(c => ({ id: c.id, label: c.name }))}
                      value={field.value ?? ''}
                      onChange={id => {
                        field.onChange(id);
                        setValue('sub_category_id', '');
                      }}
                      onCreateNew={handleCreateCategory}
                      allowCreate
                      placeholder="Select or create category"
                      onCreated={name => showToast(`Category "${name}" created`)}
                    />
                  )} />
                </F>

                {/* Sub-category — searchable + creatable (locked until category chosen) */}
                <F label="Sub-Category">
                  <Controller name="sub_category_id" control={control} render={({ field }) => (
                    <ComboBox
                      options={subCategories.map(s => ({ id: s.id, label: s.name }))}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onCreateNew={watchedCategoryId ? handleCreateSubCategory : undefined}
                      allowCreate={!!watchedCategoryId}
                      disabled={!watchedCategoryId}
                      placeholder={watchedCategoryId ? 'Select or create sub-category' : 'Select a category first'}
                      onCreated={name => showToast(`Sub-category "${name}" created`)}
                    />
                  )} />
                </F>

                {/* Brand — searchable + creatable */}
                <F label="Brand">
                  <Controller name="brand_id" control={control} render={({ field }) => (
                    <ComboBox
                      options={(brands ?? []).map((b: { id: string; name: string }) => ({ id: b.id, label: b.name }))}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onCreateNew={handleCreateBrand}
                      allowCreate
                      placeholder="Select or create brand"
                      onCreated={name => showToast(`Brand "${name}" created`)}
                    />
                  )} />
                </F>

                {/* Supplier — searchable (no create inline) */}
                <F label="Supplier">
                  <Controller name="supplier_id" control={control} render={({ field }) => (
                    <ComboBox
                      options={(suppliers ?? []).map((s: { id: string; name: string }) => ({ id: s.id, label: s.name }))}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Select supplier"
                    />
                  )} />
                </F>

                <div className="col-span-2">
                  <F label="Vehicle Compatibility">
                    <input
                      {...register('vehicle_compatibility')}
                      placeholder="e.g. Toyota Corolla 2018-2022, Honda Civic 2019+"
                      className={inputCls}
                    />
                  </F>
                </div>

                <div className="col-span-2">
                  <F label="Description">
                    <textarea
                      {...register('description')}
                      rows={3}
                      placeholder="Optional description…"
                      className={cn(inputCls, 'resize-none')}
                    />
                  </F>
                </div>

                {/* Creation toasts */}
                {toast && <div className="col-span-2"><ToastChip msg={toast} onDone={() => setToast(null)} /></div>}
              </div>
            )}

            {/* ════════ PRICING ════════ */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {/* Price chain visualization */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Price Chain</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriceNode label="Cost"   value={watchedCost}    color={costColor}   currencyStr={fmt(watchedCost)} />
                    <ArrowRight className="size-4 text-zinc-600 flex-shrink-0" />
                    <PriceNode label="Min"    value={watchedMin}     color={minColor}    currencyStr={fmt(watchedMin)} />
                    <ArrowRight className="size-4 text-zinc-600 flex-shrink-0" />
                    <PriceNode label="Retail" value={watchedRetail}  color={retailColor} currencyStr={fmt(watchedRetail)} />
                    <div className="flex-1 min-w-[60px]" />
                    {markup && (
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Markup</p>
                        <p className="text-base font-bold text-emerald-400">{markup}%</p>
                        <p className="text-[10px] text-zinc-600">Margin {margin}%</p>
                      </div>
                    )}
                  </div>
                  {(errors.min_price || errors.retail_price || errors.wholesale_price) && (
                    <div className="mt-3 space-y-1">
                      {errors.min_price      && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="size-3" />{errors.min_price.message}</p>}
                      {errors.retail_price   && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="size-3" />{errors.retail_price.message}</p>}
                      {errors.wholesale_price && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="size-3" />{errors.wholesale_price.message}</p>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {[
                    { field: 'cost_price',      label: 'Cost Price',          required: true  },
                    { field: 'min_price',        label: 'Min Selling Price',   required: false },
                    { field: 'retail_price',     label: 'Retail Price',        required: true  },
                    { field: 'wholesale_price',  label: 'Wholesale Price',     required: false },
                  ].map(({ field, label, required }) => (
                    <F key={field} label={label} error={(errors as Record<string, { message?: string }>)[field]?.message} required={required}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-medium">
                          {currencyConfig.symbol_position === 'before' ? currencyConfig.symbol : ''}
                        </span>
                        <input
                          type="number" step="0.01" min="0"
                          {...register(field as keyof ProductInput, { valueAsNumber: true })}
                          placeholder="0.00"
                          className={cn(inputCls, currencyConfig.symbol_position === 'before' && 'pl-8')}
                        />
                      </div>
                    </F>
                  ))}
                </div>

                {/* Bulk pricing */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Bulk / Pack Pricing</p>
                  <div className="grid grid-cols-3 gap-4">
                    <F label="Units per Pack">
                      <input type="number" min="1" step="1" {...register('bulk_qty', { valueAsNumber: true })} placeholder="1" className={inputCls} />
                    </F>
                    <F label="Bulk Cost">
                      <input type="number" step="0.01" min="0" {...register('bulk_cost_price', { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
                    </F>
                    <F label="Bulk Retail">
                      <input type="number" step="0.01" min="0" {...register('bulk_retail_price', { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
                    </F>
                  </div>
                </div>
              </div>
            )}

            {/* ════════ INVENTORY ════════ */}
            {activeTab === 'inventory' && (
              <div className="space-y-5">
                <Controller name="track_stock" control={control} render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                      field.value
                        ? 'border-brand-500/30 bg-brand-500/5 text-brand-300'
                        : 'border-white/10 bg-white/[0.03] text-zinc-500',
                    )}
                  >
                    {field.value ? <ToggleRight className="size-5 flex-shrink-0" /> : <ToggleLeft className="size-5 flex-shrink-0" />}
                    <div className="text-left">
                      <p className="text-sm font-medium">{field.value ? 'Stock tracking ON' : 'Stock tracking OFF'}</p>
                      <p className="text-xs opacity-60 mt-0.5 font-normal">
                        {field.value ? 'Inventory levels will be tracked' : 'Item sold without deducting stock (e.g. service)'}
                      </p>
                    </div>
                  </button>
                )} />

                {watchedTrack && (
                  <div className="grid grid-cols-2 gap-5">
                    <F label="Opening / Current Stock" error={errors.current_stock?.message}>
                      <input
                        type="number" step="0.01" min="0"
                        {...register('current_stock', { valueAsNumber: true })}
                        placeholder="0"
                        className={inputCls}
                        readOnly={!!product}
                      />
                    </F>
                    <div />
                    <F label="Reorder Level">
                      <input type="number" step="0.01" min="0" {...register('reorder_level', { valueAsNumber: true })} placeholder="5" className={inputCls} />
                    </F>
                    <F label="Reorder Quantity">
                      <input type="number" step="0.01" min="0" {...register('reorder_qty', { valueAsNumber: true })} placeholder="10" className={inputCls} />
                    </F>
                    {product && (
                      <div className="col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
                        💡 Use <strong>Receive Stock (GRN)</strong> or <strong>Stock Adjustments</strong> to change stock levels after creation.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ════════ UNITS & BARCODE ════════ */}
            {activeTab === 'units' && (
              <div className="space-y-6">
                {/* UOM section */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Units of Measure</p>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="Base UOM (single unit)">
                      <select {...register('base_uom_id')} className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all">
                        <option value="">— Select UOM —</option>
                        {(uoms as UOMType[] ?? []).map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                        ))}
                      </select>
                    </F>
                    <F label="Bulk UOM (pack / box)">
                      <select {...register('bulk_uom_id')} className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all">
                        <option value="">— None —</option>
                        {(uoms as UOMType[] ?? []).map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                        ))}
                      </select>
                    </F>
                  </div>
                  <F label="Conversion Ratio" error={errors.bulk_qty?.message}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 whitespace-nowrap">1 {bulkUomLabel} =</span>
                      <input
                        type="number" min="1" step="0.001"
                        {...register('bulk_qty', { valueAsNumber: true })}
                        placeholder="1"
                        className={cn(inputCls, 'w-28')}
                      />
                      <span className="text-sm text-zinc-400 whitespace-nowrap">{baseUomLabel}</span>
                    </div>
                    {watchedBulkQty > 1 && watchedCost > 0 && (
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        Cost per {baseUomLabel}: {fmt(watchedCost / watchedBulkQty)}
                      </p>
                    )}
                  </F>
                </div>

                {/* Barcodes */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Barcode className="size-3.5" />Barcodes
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={newBarcode}
                      onChange={e => setNewBarcode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBarcode())}
                      placeholder="Scan, type, or generate…"
                      className={cn(inputCls, 'flex-1')}
                    />
                    <button type="button" onClick={handleGenerateBarcode} title="Generate" className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                      <RefreshCw className="size-3.5" />
                    </button>
                    <button type="button" onClick={addBarcode} disabled={!newBarcode} className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs transition-all disabled:opacity-40">
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {barcodes.length > 0
                    ? barcodes.map((b, i) => (
                      <div key={b} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', i === 0 ? 'bg-brand-500/20 text-brand-300' : 'bg-white/5 text-zinc-500')}>
                            {i === 0 ? 'PRIMARY' : `ALT ${i}`}
                          </span>
                          <span className="font-mono text-sm text-zinc-300">{b}</span>
                        </div>
                        <button type="button" onClick={() => removeBarcode(b)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))
                    : <p className="text-xs text-zinc-600 text-center py-3">No barcodes — first barcode becomes the primary</p>
                  }
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-zinc-900/50">
        <div className="flex gap-1.5">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={cn('h-2 rounded-full transition-all', activeTab === t.id ? 'w-4 bg-brand-500' : 'w-2 bg-white/20')}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="size-4" />Cancel
          </button>
          <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all disabled:opacity-50">
            <Save className="size-4" />
            {isLoading ? 'Saving…' : product ? 'Save Changes' : 'Create Item'}
          </button>
        </div>
      </div>
    </form>
  );
}
