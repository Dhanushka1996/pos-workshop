'use client';

import Link from 'next/link';
import { Package, ArrowLeft } from 'lucide-react';
import { ProductForm } from '@/components/inventory/ProductForm';

export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
          <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
          <span>/</span>
          <Link href="/dashboard/inventory/products" className="hover:text-zinc-400 transition-colors">Products</Link>
          <span>/</span>
          <span className="text-zinc-400">New Product</span>
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
              Add New Product
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Fill in the details to add a new part to your inventory</p>
          </div>
        </div>
      </div>

      <ProductForm />
    </div>
  );
}
