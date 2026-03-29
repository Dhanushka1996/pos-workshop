'use client';

import { motion } from 'framer-motion';
import { Shield, CreditCard, Wrench, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG } from '@/types';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

const ROLE_ICONS = {
  admin:    Shield,
  cashier:  CreditCard,
  mechanic: Wrench,
};

interface RoleCardProps {
  role: UserRole;
}

export function RoleCard({ role }: RoleCardProps) {
  const config = ROLE_CONFIG[role];
  const Icon = ROLE_ICONS[role];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      className={cn(
        'rounded-2xl border p-6 space-y-4 transition-all duration-300',
        config.bgColor
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn('size-12 rounded-xl flex items-center justify-center', config.bgColor, 'border', config.bgColor.includes('violet') ? 'border-violet-500/30' : config.bgColor.includes('sky') ? 'border-sky-500/30' : 'border-amber-500/30')}>
          <Icon className={cn('size-6', config.color)} />
        </div>
        <div>
          <p className={cn('text-lg font-semibold', config.color)}>{config.label}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{config.description}</p>
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600 mb-3">
          Your Access
        </p>
        <ul className="space-y-2">
          {config.permissions.map((perm) => (
            <li key={perm} className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className={cn('size-4 rounded-full flex items-center justify-center flex-shrink-0', config.bgColor)}>
                <Check className={cn('size-2.5', config.color)} />
              </div>
              {perm}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
