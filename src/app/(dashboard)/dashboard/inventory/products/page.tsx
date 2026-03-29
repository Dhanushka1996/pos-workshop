'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

// This route has been superseded by /inventory/items
export default function ProductsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/inventory/items'); }, [router]);
  return null;
}
