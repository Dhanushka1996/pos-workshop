'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, ChevronDown, Bell } from 'lucide-react';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleBadge } from '@/components/ui/Badge';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';

interface DashboardHeaderProps {
  profile: Profile;
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    await nextAuthSignOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 flex items-center px-6 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3 mr-auto">
        <div className="size-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="font-semibold text-white text-sm tracking-tight hidden sm:block">
          POS Workshop
        </span>
      </div>

      {/* Actions */}
      <button className="relative size-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-500 ring-2 ring-zinc-950" />
      </button>

      <ThemeToggle />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-white/10 transition-all duration-200 group"
        >
          {/* Avatar */}
          <div className="size-8 rounded-lg bg-gradient-to-br from-brand-500/80 to-violet-600/80 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white/10">
            {getInitials(profile.full_name)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-white leading-none">
              {profile.full_name ?? profile.email.split('@')[0]}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">{profile.role}</p>
          </div>
          <ChevronDown
            className={`size-4 text-zinc-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
              >
                {/* Profile info */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-medium text-white">
                    {profile.full_name ?? 'User'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{profile.email}</p>
                  <div className="mt-2">
                    <RoleBadge role={profile.role} />
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/dashboard/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-150"
                  >
                    <Settings className="size-4 text-zinc-500" />
                    Settings
                  </button>

                  <div className="h-px bg-white/[0.06] my-1" />

                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
