'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ItemForm } from '@/components/inventory/ItemForm';
import { useCreateProduct } from '@/hooks/inventory/useProducts';
import type { ProductInput } from '@/lib/validations/inventory';

export const dynamic = 'force-dynamic';

export default function NewItemPage() {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateProduct();

  const handleSubmit = async (data: ProductInput) => {
    await mutateAsync(data);
    router.push('/inventory/items');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.push('/inventory/items')}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Add New Item</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Fill in the tabs below to create a new inventory item</p>
        </div>
      </div>

      <ItemForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/inventory/items')}
        isLoading={isPending}
      />
    </div>
  );
}
