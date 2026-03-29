import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
          {
            // Variants
            'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 hover:from-brand-600 hover:to-brand-700 hover:shadow-brand-500/40 active:scale-[0.98]':
              variant === 'primary',
            'bg-white/10 text-white border border-white/15 hover:bg-white/20 backdrop-blur-sm dark:bg-white/5 dark:hover:bg-white/10':
              variant === 'secondary',
            'text-zinc-400 hover:text-white hover:bg-white/10 dark:hover:bg-zinc-800':
              variant === 'ghost',
            'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20':
              variant === 'danger',
            // Sizes
            'h-8 px-3 text-sm': size === 'sm',
            'h-11 px-5 text-sm': size === 'md',
            'h-13 px-7 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
