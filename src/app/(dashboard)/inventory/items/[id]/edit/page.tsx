'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ItemForm } from '@/components/inventory/ItemForm';
import { useProduct, useUpdateProduct } from '@/hooks/inventory/useProducts';
import type { ProductInput } from '@/lib/validations/inventory';

export default function EditItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(params.id);
  const { mutateAsync, isPending }   = useUpdateProduct();

  const handleSubmit = async (data: ProductInput) => {
    await mutateAsync({ id: params.id, data });
    router.push('/inventory/items');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="size-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-zinc-400">Item not found</p>
        <button onClick={() => router.back()} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.back()}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Edit Item</h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">{product.item_code} — {product.name}</p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${product.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
            {product.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <ItemForm
        product={product}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/inventory/items')}
        isLoading={isPending}
      />
    </div>
  );
}
