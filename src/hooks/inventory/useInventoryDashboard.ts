'use client';
import { useQuery } from '@tanstack/react-query';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    staleTime: 30_000,
  });
}
