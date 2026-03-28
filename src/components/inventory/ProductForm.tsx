'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/inventory/useCategories';
import { useBrands } from '@/hooks/inventory/useBrands';
import { useSuppliers } from '@/hooks/inventory/useSuppliers';
import { useCreateProduct, useUpdateProduct, type Product } from '@/hooks/inventory/useProducts';
import { useRouter } from 'next/navigation';

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  item_code: z.string().min(1, 'Item code is required'),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  supplier_id: z.string().optional(),
  vehicle_compatibility: z.string().optional(),
  cost_price: z.number({ invalid_type_error: 'Required' }).min(0, 'Must be ≥ 0'),
  retail_price: z.number({ invalid_type_error: 'Required' }).min(0, 'Must be ≥ 0'),
  reorder_level: z.number({ invalid_type_error: 'Required' }).min(0).default(5),
  current_stock: z.number({ invalid_type_error: 'Required' }).min(0).default(0),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProductFormProps {
  product?: Product;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

const inputClass = (hasError?: boolean) =>
  cn(
    'w-full h-11 px-4 rounded-xl border bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all',
    hasError
      ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
  );

const selectClass = cn(
  'w-full h-11 px-4 rounded-xl border border-white/10 bg-zinc-800/60 text-white text-sm outline-none transition-all',
  'hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
);

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: suppliers = [] } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      item_code: '',
      category_id: '',
      brand_id: '',
      supplier_id: '',
      vehicle_compatibility: '',
      cost_price: 0,
      retail_price: 0,
      reorder_level: 5,
      current_stock: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        item_code: product.item_code,
        category_id: product.category_id ?? '',
        brand_id: product.brand_id ?? '',
        supplier_id: product.supplier_id ?? '',
        vehicle_compatibility: product.vehicle_compatibility ?? '',
        cost_price: product.cost_price,
        retail_price: product.retail_price,
        reorder_level: product.reorder_level,
        current_stock: product.current_stock,
        description: product.description ?? '',
      });
    }
  }, [product, reset]);

  const isPending = createProduct.isPending || updateProduct.isPending;
  const error = createProduct.error || updateProduct.error;

  function onSubmit(values: FormValues) {
    const data = {
      ...values,
      category_id: values.category_id || undefined,
      brand_id: values.brand_id || undefined,
      supplier_id: values.supplier_id || undefined,
      vehicle_compatibility: values.vehicle_compatibility || undefined,
      description: values.description || undefined,
    };

    if (isEdit) {
      updateProduct.mutate(
        { id: product.id, data },
        { onSuccess: () => router.push('/dashboard/inventory/products') }
      );
    } else {
      createProduct.mutate(data as any, {
        onSuccess: () => router.push('/dashboard/inventory/products'),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Section: Basic Info */}
      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Package className="size-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Basic Information</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Product name, part number and classification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <FieldLabel required>Product Name</FieldLabel>
            <input
              {...register('name')}
              placeholder="e.g. Bosch Premium Oil Filter"
              className={inputClass(!!errors.name)}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div>
            <FieldLabel required>Item Code</FieldLabel>
            <input
              {...register('item_code')}
              placeholder="e.g. BSH-OF-3330"
              className={cn(inputClass(!!errors.item_code), 'font-mono')}
            />
            <FieldError message={errors.item_code?.message} />
          </div>

          <div>
            <FieldLabel>Category</FieldLabel>
            <select {...register('category_id')} className={selectClass}>
              <option value="">— No Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Brand</FieldLabel>
            <select {...register('brand_id')} className={selectClass}>
              <option value="">— No Brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Supplier</FieldLabel>
            <select {...register('supplier_id')} className={selectClass}>
              <option value="">— No Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Vehicle Compatibility</FieldLabel>
            <input
              {...register('vehicle_compatibility')}
              placeholder="e.g. Toyota Camry 2018-2023, Honda Civic"
              className={inputClass()}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Optional product description..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Section: Pricing */}
      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-white text-sm">Pricing</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Cost and selling prices</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel required>Cost Price ($)</FieldLabel>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('cost_price', { valueAsNumber: true })}
              placeholder="0.00"
              className={inputClass(!!errors.cost_price)}
            />
            <FieldError message={errors.cost_price?.message} />
          </div>

          <div>
            <FieldLabel required>Retail Price ($)</FieldLabel>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('retail_price', { valueAsNumber: true })}
              placeholder="0.00"
              className={inputClass(!!errors.retail_price)}
            />
            <FieldError message={errors.retail_price?.message} />
          </div>
        </div>
      </div>

      {/* Section: Stock */}
      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-white text-sm">Stock Levels</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Opening stock and minimum thresholds</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel required>Current Stock Qty</FieldLabel>
            <input
              type="number"
              min="0"
              step="1"
              {...register('current_stock', { valueAsNumber: true })}
              placeholder="0"
              className={inputClass(!!errors.current_stock)}
            />
            <FieldError message={errors.current_stock?.message} />
          </div>

          <div>
            <FieldLabel required>Reorder Level</FieldLabel>
            <input
              type="number"
              min="0"
              step="1"
              {...register('reorder_level', { valueAsNumber: true })}
              placeholder="5"
              className={inputClass(!!errors.reorder_level)}
            />
            <p className="text-xs text-zinc-600 mt-1">
              Alert will trigger when stock falls to or below this value
            </p>
            <FieldError message={errors.reorder_level?.message} />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{(error as Error).message}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/dashboard/inventory/products')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || (!isDirty && isEdit)}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
