import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const roleStyles: Record<UserRole, string> = {
  admin:    'bg-violet-500/15 text-violet-300 border-violet-500/25',
  cashier:  'bg-sky-500/15    text-sky-300    border-sky-500/25',
  mechanic: 'bg-amber-500/15  text-amber-300  border-amber-500/25',
};

interface BadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        roleStyles[role],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {role}
    </span>
  );
}
