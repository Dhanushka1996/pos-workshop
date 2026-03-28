'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This route has been superseded by /inventory/items
export default function ProductsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/inventory/items'); }, [router]);
  return null;
}
