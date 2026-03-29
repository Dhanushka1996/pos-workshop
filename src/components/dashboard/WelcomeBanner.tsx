'use client';

import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@/types';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

interface WelcomeBannerProps {
  profile: Profile;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeBanner({ profile }: WelcomeBannerProps) {
  const name = profile.full_name?.split(' ')[0] ?? profile.email.split('@')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-br from-brand-950/80 via-zinc-900/80 to-zinc-900/80 p-6 md:p-8"
    >
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 size-48 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 left-1/3 size-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-zinc-400 text-sm mb-1">{formatDate(new Date().toISOString())}</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {getGreeting()}, {name} 👋
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5">
            You're logged in as{' '}
            <span className="text-brand-400 font-medium capitalize">{profile.role}</span>.
            Here's your workspace.
          </p>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse-slow" />
          <span className="text-emerald-300 text-sm font-medium">System Online</span>
        </div>
      </div>
    </motion.div>
  );
}
