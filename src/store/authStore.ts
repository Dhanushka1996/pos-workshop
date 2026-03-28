import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Profile } from '@/types';

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      profile: null,
      isLoading: true,
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ profile: null, isLoading: false }),
    }),
    { name: 'auth-store' }
  )
);
