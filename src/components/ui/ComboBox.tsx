'use client';

import {
  useState, useRef, useEffect, useCallback,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboOption {
  id:    string;
  label: string;
}

interface ComboBoxProps {
  options:      ComboOption[];
  value?:       string;
  onChange:     (id: string) => void;
  /** If provided AND allowCreate=true: called when user presses Enter on a new name.
   *  Must return the new record's id. */
  onCreateNew?: (name: string) => Promise<string>;
  placeholder?: string;
  allowCreate?: boolean;
  isLoading?:   boolean;
  disabled?:    boolean;
  className?:   string;
  clearable?:   boolean;
  /** Toast callback so parent can show a notification */
  onCreated?:   (label: string) => void;
}

interface DropPos { top: number; left: number; width: number }

export function ComboBox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder  = 'Select…',
  allowCreate  = false,
  isLoading    = false,
  disabled     = false,
  className,
  clearable    = true,
  onCreated,
}: ComboBoxProps) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState('');
  const [busy,    setBusy]    = useState(false);
  const [cursor,  setCursor]  = useState(-1);
  const [dropPos, setDropPos] = useState<DropPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const selected = options.find(o => o.id === value);

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const exactMatch = filtered.some(
    o => o.label.toLowerCase() === search.trim().toLowerCase(),
  );
  const canCreate = allowCreate && !!onCreateNew && !!search.trim() && !exactMatch;

  const totalItems = filtered.length + (canCreate ? 1 : 0);

  // ── position helpers ──
  const calcPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  // ── open / close ──
  const openDropdown = () => {
    if (disabled) return;
    calcPosition();
    setOpen(true);
    setSearch('');
    setCursor(-1);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearch('');
    setCursor(-1);
  };

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const handler = () => { calcPosition(); };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, calcPosition]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const dropdown = document.getElementById('combobox-dropdown');
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdown &&
        !dropdown.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── actions ──
  const handleSelect = (id: string) => {
    onChange(id);
    closeDropdown();
  };

  const handleCreate = async () => {
    if (!canCreate || !onCreateNew) return;
    setBusy(true);
    try {
      const trimmed = search.trim();
      const newId   = await onCreateNew(trimmed);
      onChange(newId);
      onCreated?.(trimmed);
      closeDropdown();
    } catch {
      // parent handles errors
    } finally {
      setBusy(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // ── keyboard navigation ──
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && cursor < filtered.length) {
        handleSelect(filtered[cursor].id);
      } else if (cursor === filtered.length && canCreate) {
        handleCreate();
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  // ── dropdown DOM ──
  const dropdown = open && mounted && dropPos ? createPortal(
    <div
      id="combobox-dropdown"
      style={{
        position: 'fixed',
        top:      dropPos.top,
        left:     dropPos.left,
        width:    dropPos.width,
        zIndex:   9999,
      }}
      className="rounded-xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden"
    >
      {/* search */}
      <div className="p-2 border-b border-white/[0.06]">
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setCursor(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Type to search…"
          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
        />
      </div>

      {/* options list */}
      <ul className="max-h-52 overflow-y-auto py-1.5">
        {filtered.length === 0 && !canCreate && (
          <li className="px-3 py-3 text-sm text-zinc-500 text-center">No matches</li>
        )}

        {filtered.map((opt, i) => (
          <li key={opt.id}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(opt.id); }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm transition-all text-left',
                cursor === i
                  ? 'bg-brand-500/10 text-white'
                  : value === opt.id
                    ? 'bg-white/[0.04] text-white'
                    : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <span className="size-3.5 flex-shrink-0 flex items-center">
                {value === opt.id && <Check className="size-3.5 text-brand-400" />}
              </span>
              {opt.label}
            </button>
          </li>
        ))}

        {canCreate && (
          <li>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreate(); }}
              disabled={busy}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm transition-all border-t border-white/[0.06]',
                cursor === filtered.length
                  ? 'bg-brand-500/10 text-brand-300'
                  : 'text-brand-400 hover:bg-brand-500/[0.08] hover:text-brand-300',
              )}
            >
              {busy
                ? <Loader2 className="size-3.5 animate-spin flex-shrink-0" />
                : <Plus     className="size-3.5 flex-shrink-0" />
              }
              <span>
                {busy ? 'Creating…' : (
                  <><span className="text-zinc-500">Press Enter to create </span>"{search.trim()}"</>
                )}
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open ? closeDropdown : openDropdown}
        disabled={disabled}
        className={cn(
          'flex items-center w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10',
          'text-sm text-left transition-all min-h-[42px]',
          open    && 'border-brand-500 ring-1 ring-brand-500/20',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <span className={cn('flex-1 truncate', selected ? 'text-white' : 'text-zinc-500')}>
          {selected?.label ?? placeholder}
        </span>

        {clearable && selected && !disabled && (
          <X
            onClick={handleClear}
            className="size-3.5 text-zinc-500 hover:text-white flex-shrink-0 mr-1.5 transition-colors"
          />
        )}

        {isLoading
          ? <Loader2 className="size-3.5 text-zinc-500 animate-spin flex-shrink-0" />
          : <ChevronDown className={cn(
              'size-3.5 text-zinc-500 flex-shrink-0 transition-transform duration-150',
              open && 'rotate-180',
            )} />
        }
      </button>

      {dropdown}
    </>
  );
}
