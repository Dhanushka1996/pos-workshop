'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/hooks/inventory/useSuppliers';

const schema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  contact_name: z.string().optional(),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

interface SupplierModalProps {
  supplier?: Supplier;
  onClose: () => void;
}

const inputCls = (hasError?: boolean) => cn(
  'w-full h-11 px-4 rounded-xl border bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all',
  hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
);

export function SupplierModal({ supplier, onClose }: SupplierModalProps) {
  const isEdit = !!supplier;
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', contact_name: '', email: '', phone: '', address: '', notes: '', is_active: true },
  });

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        contact_name: supplier.contact_name ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
        is_active: supplier.is_active,
      });
    }
  }, [supplier, reset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isPending = createSupplier.isPending || updateSupplier.isPending;
  const error = createSupplier.error || updateSupplier.error;

  function onSubmit(values: FormValues) {
    const data = {
      name: values.name,
      contact_name: values.contact_name || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
      is_active: values.is_active,
    };
    if (isEdit) {
      updateSupplier.mutate({ id: supplier.id, data }, { onSuccess: onClose });
    } else {
      createSupplier.mutate(data, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.1] bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07] sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Truck className="size-4 text-sky-400" />
            </div>
            <h2 className="font-semibold text-white">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Company Name <span className="text-red-400">*</span></label>
              <input {...register('name')} placeholder="e.g. AutoParts Direct Ltd" className={inputCls(!!errors.name)} />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contact Person</label>
              <input {...register('contact_name')} placeholder="e.g. James Robertson" className={inputCls()} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
              <input {...register('phone')} placeholder="+1-555-0101" className={inputCls()} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="supplier@company.com" className={inputCls(!!errors.email)} />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Address</label>
              <input {...register('address')} placeholder="123 Industrial Park, Detroit, MI" className={inputCls()} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Payment terms, special notes..."
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" {...register('is_active')} className="size-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500" />
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Active supplier</span>
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {(error as Error).message}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
