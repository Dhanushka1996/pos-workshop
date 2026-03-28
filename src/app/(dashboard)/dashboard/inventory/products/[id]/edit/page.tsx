'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Package, ArrowLeft, Loader2 } from 'lucide-react';
import { ProductForm } from '@/components/inventory/ProductForm';
import { useProduct } from '@/hooks/inventory/useProducts';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(params.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
          <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
          <span>/</span>
          <Link href="/dashboard/inventory/products" className="hover:text-zinc-400 transition-colors">Products</Link>
          <span>/</span>
          <span className="text-zinc-400">Edit</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory/products"
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="size-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Package className="size-5 text-indigo-400" />
              </div>
              {isLoading ? 'Loading...' : product ? `Edit: ${product.name}` : 'Edit Product'}
            </h1>
            {product && (
              <p className="text-zinc-500 text-sm mt-1 font-mono">{product.part_number}</p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 text-indigo-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-medium">Product not found</p>
          <Link href="/dashboard/inventory/products" className="text-sm text-zinc-400 hover:text-white mt-2 inline-block">
            ← Back to products
          </Link>
        </div>
      ) : (
        <ProductForm product={product} />
      )}
    </div>
  );
}
