import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: 'brand' | 'emerald' | 'amber' | 'sky' | 'rose';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  brand:   { icon: 'text-brand-400',   bg: 'bg-brand-500/10',   border: 'border-brand-500/15'  },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
  amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/15'  },
  sky:     { icon: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/15'    },
  rose:    { icon: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/15'   },
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'brand',
  trend,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-5 hover:border-white/15 transition-all duration-300 hover:bg-zinc-900/80 group">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'size-10 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105',
            c.bg,
            c.border
          )}
        >
          <span className={c.icon}>{icon}</span>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-lg',
              trend.positive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
