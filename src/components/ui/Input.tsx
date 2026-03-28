import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-300 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-xl border bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-200',
              'border-white/10 hover:border-white/20 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              'dark:bg-zinc-900/50 dark:border-zinc-700/60 dark:hover:border-zinc-600 dark:focus:border-brand-500',
              error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20',
              leftIcon && 'pl-10',
              rightElement && 'pr-10',
              className
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {rightElement}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="size-3.5 rounded-full border border-red-400 inline-flex items-center justify-center flex-shrink-0 text-[9px]">!</span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-zinc-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
