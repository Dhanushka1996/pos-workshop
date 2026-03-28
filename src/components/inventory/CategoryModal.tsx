'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useCreateCategory, useUpdateCategory, type Category } from '@/hooks/inventory/useCategories';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6366f1', '#64748b',
];

import { z } from 'zod';
const schema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});
type FormValues = z.infer<typeof schema>;

interface CategoryModalProps {
  category?: Category;
  onClose: () => void;
}

export function CategoryModal({ category, onClose }: CategoryModalProps) {
  const isEdit = !!category;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', color: '#6366f1' },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (category) reset({ name: category.name, description: category.description ?? '', color: category.color ?? '#6366f1' });
  }, [category, reset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  function onSubmit(values: FormValues) {
    const data = { ...values, description: values.description || undefined };
    if (isEdit) {
      updateCategory.mutate({ id: category.id, data }, { onSuccess: onClose });
    } else {
      createCategory.mutate(data, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedColor}20`, border: `1px solid ${selectedColor}40` }}>
              <Tag className="size-4" style={{ color: selectedColor }} />
            </div>
            <h2 className="font-semibold text-white">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Category Name <span className="text-red-400">*</span></label>
            <input
              {...register('name')}
              placeholder="e.g. Engine, Brakes, Filters"
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
              rows={2}
              placeholder="Optional description..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-800/60 text-white text-sm placeholder:text-zinc-600 outline-none transition-all hover:border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={cn(
                    'size-8 rounded-lg transition-all',
                    selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setValue('color', e.target.value)}
                  className="size-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="Custom color"
                />
                <span className="text-xs text-zinc-500 font-mono">{selectedColor}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
