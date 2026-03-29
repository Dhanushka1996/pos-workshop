'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useCreateBrand, useUpdateBrand, type Brand } from '@/hooks/inventory/useBrands';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface BrandModalProps {
  brand?: Brand;
  onClose: () => void;
}

export function BrandModal({ brand, onClose }: BrandModalProps) {
  const isEdit = !!brand;
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (brand) reset({ name: brand.name, description: brand.description ?? '' });
  }, [brand, reset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isPending = createBrand.isPending || updateBrand.isPending;

  function onSubmit(values: FormValues) {
    const data = { name: values.name, description: values.description || undefined };
    if (isEdit) {
      updateBrand.mutate({ id: brand.id, data }, { onSuccess: onClose });
    } else {
      createBrand.mutate(data, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1] bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Award className="size-4 text-amber-400" />
            </div>
            <h2 className="font-semibold text-white">{isEdit ? 'Edit Brand' : 'New Brand'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Brand Name <span className="text-red-400">*</span></label>
            <input
              {...register('name')}
              placeholder="e.g. Bosch, NGK, Monroe"
              className={cn(
                'w-full h-11 px-4 rounded-xl border bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all',
                errors.name ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              )}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Optional brand description..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
