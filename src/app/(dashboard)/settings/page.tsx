'use client';

import { useState, useEffect } from 'react';
import {
  Settings, DollarSign, Building2, Save, CheckCircle2,
  Shield, RefreshCw, Download, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, ArrowUpCircle, Package, Database, HardDrive,
  ExternalLink, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { CURRENCY_PRESETS, formatCurrency, buildConfig } from '@/lib/currency';
import { useCurrencyStore } from '@/store/currencyStore';
import {
  useVersion, useBackups, useCreateBackup, useDeleteBackup, useUpdateCheck,
} from '@/hooks/useSystem';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ── Helpers ────────────────────────────────────────────────────────────────
const PREVIEW_AMOUNT = 1234567.89;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type Tab = 'general' | 'currency' | 'system';

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] sticky top-0 z-10 bg-zinc-950/80">
        <div className="size-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
          <Settings className="size-4" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">System Settings</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Configure your business, currency and system preferences</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-6 pt-4 border-b border-white/[0.06]">
        {([
          { id: 'general',  label: 'General',  icon: Building2  },
          { id: 'currency', label: 'Currency', icon: DollarSign },
          { id: 'system',   label: 'System',   icon: Shield     },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-all',
              tab === id
                ? 'border-brand-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'general'  && <GeneralTab />}
        {tab === 'currency' && <CurrencyTab />}
        {tab === 'system'   && <SystemTab />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: GENERAL
// ═══════════════════════════════════════════════════════════════════════════
function GeneralTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings                = useUpdateSettings();
  const [form, setForm] = useState({
    business_name:  '',
    tax_rate:       0,
    receipt_footer: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      business_name:  settings.business_name,
      tax_rate:       settings.tax_rate,
      receipt_footer: settings.receipt_footer ?? '',
    });
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      business_name:   form.business_name,
      tax_rate:        Number(form.tax_rate),
      receipt_footer:  form.receipt_footer,
      // pass through existing currency fields unchanged
      currency_code:   settings?.currency_code   ?? 'LKR',
      currency_symbol: settings?.currency_symbol ?? 'Rs',
      symbol_position: (settings?.symbol_position ?? 'before') as 'before' | 'after',
      decimal_places:  settings?.decimal_places  ?? 2,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls  = 'w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all';
  const labelCls  = 'block text-xs font-medium text-zinc-400 mb-1.5';

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="px-6 py-6 space-y-6 max-w-2xl">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <Building2 className="size-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Business Information</h2>
        </div>

        <div>
          <label className={labelCls}>Business Name</label>
          <input
            value={form.business_name}
            onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            placeholder="Your business name"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Receipt Footer</label>
          <textarea
            value={form.receipt_footer}
            onChange={e => setForm(p => ({ ...p, receipt_footer: e.target.value }))}
            rows={2}
            placeholder="Thank you for your business!"
            className={cn(inputCls, 'resize-none')}
          />
        </div>

        <div>
          <label className={labelCls}>Tax Rate (%)</label>
          <input
            type="number"
            min="0" max="100" step="0.1"
            value={form.tax_rate}
            onChange={e => setForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))}
            className={cn(inputCls, 'max-w-[140px]')}
          />
          <p className="text-xs text-zinc-600 mt-1">Set to 0 if tax is already included in prices</p>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
          saved ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50',
        )}
      >
        {saved ? <><CheckCircle2 className="size-4" />Saved!</> : updateSettings.isPending ? 'Saving…' : <><Save className="size-4" />Save Changes</>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: CURRENCY
// ═══════════════════════════════════════════════════════════════════════════
function CurrencyTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings                = useUpdateSettings();
  const setCurrencyConfig             = useCurrencyStore(s => s.setConfig);

  const [form, setForm] = useState({
    currency_code:   'LKR',
    currency_symbol: 'Rs',
    symbol_position: 'before' as 'before' | 'after',
    decimal_places:  2,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      currency_code:   settings.currency_code,
      currency_symbol: settings.currency_symbol,
      symbol_position: settings.symbol_position as 'before' | 'after',
      decimal_places:  settings.decimal_places,
    });
  }, [settings]);

  const handleCurrencyCode = (code: string) => {
    const preset = CURRENCY_PRESETS[code];
    setForm(p => ({
      ...p,
      currency_code:   code,
      currency_symbol: preset?.symbol          ?? p.currency_symbol,
      symbol_position: preset?.symbol_position ?? p.symbol_position,
      decimal_places:  preset?.decimal_places  ?? p.decimal_places,
    }));
  };

  const handleSave = async () => {
    const result = await updateSettings.mutateAsync({
      ...form,
      decimal_places:  Number(form.decimal_places),
      // pass through existing general fields unchanged
      business_name:   settings?.business_name   ?? '',
      tax_rate:        settings?.tax_rate         ?? 0,
      receipt_footer:  settings?.receipt_footer   ?? '',
    });
    setCurrencyConfig(buildConfig(
      result.currency_code, result.currency_symbol,
      result.symbol_position, result.decimal_places,
    ));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewConfig = {
    code:            form.currency_code,
    symbol:          form.currency_symbol,
    symbol_position: form.symbol_position,
    decimal_places:  form.decimal_places,
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all';
  const selectCls = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all';
  const labelCls  = 'block text-xs font-medium text-zinc-400 mb-1.5';

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="px-6 py-6 space-y-6 max-w-2xl">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <DollarSign className="size-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Currency Settings</h2>
        </div>

        <div>
          <label className={labelCls}>Quick Select Preset</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CURRENCY_PRESETS).map(([code, preset]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencyCode(code)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  form.currency_code === code
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white',
                )}
              >
                {preset.symbol} {code}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Currency Code</label>
            <input
              value={form.currency_code}
              onChange={e => setForm(p => ({ ...p, currency_code: e.target.value.toUpperCase() }))}
              placeholder="LKR"
              maxLength={5}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Symbol</label>
            <input
              value={form.currency_symbol}
              onChange={e => setForm(p => ({ ...p, currency_symbol: e.target.value }))}
              placeholder="Rs"
              maxLength={5}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Symbol Position</label>
            <select
              value={form.symbol_position}
              onChange={e => setForm(p => ({ ...p, symbol_position: e.target.value as 'before' | 'after' }))}
              className={selectCls}
            >
              <option value="before">Before amount (Rs 100)</option>
              <option value="after">After amount (100 Rs)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Decimal Places</label>
            <select
              value={form.decimal_places}
              onChange={e => setForm(p => ({ ...p, decimal_places: parseInt(e.target.value) }))}
              className={selectCls}
            >
              <option value="0">0 — no decimals</option>
              <option value="2">2 — standard</option>
              <option value="3">3 — precise</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Live Preview</p>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(PREVIEW_AMOUNT, previewConfig)}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Negative: {formatCurrency(-1234.5, previewConfig)} · Zero: {formatCurrency(0, previewConfig)}
          </p>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
          saved ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50',
        )}
      >
        {saved ? <><CheckCircle2 className="size-4" />Saved!</> : updateSettings.isPending ? 'Saving…' : <><Save className="size-4" />Save Changes</>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
function SystemTab() {
  return (
    <div className="px-6 py-6 space-y-6 max-w-2xl">
      <VersionCard />
      <UpdateCard />
      <BackupCard />
      <MigrationGuide />
    </div>
  );
}

// ── Version Card ───────────────────────────────────────────────────────────
function VersionCard() {
  const { data, isLoading } = useVersion();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Package className="size-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Application Version</h2>
        </div>
        {data && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            {data.channel}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-32 bg-white/5 rounded-lg" />
          <div className="h-4 w-48 bg-white/5 rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div>
            <p className="text-3xl font-bold text-white tracking-tight">v{data.version}</p>
            <p className="text-xs text-zinc-500 mt-1">Released {data.buildDate}</p>
            {data.releaseNotes && (
              <p className="text-xs text-zinc-400 mt-1.5">{data.releaseNotes}</p>
            )}
          </div>

          {data.changelog.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                View full changelog ({data.changelog.length} release{data.changelog.length !== 1 ? 's' : ''})
              </button>

              {expanded && (
                <div className="mt-3 space-y-4 border-l-2 border-white/[0.06] pl-4">
                  {data.changelog.map(rel => (
                    <ChangelogEntry key={rel.version} release={rel} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">Version information unavailable</p>
      )}
    </section>
  );
}

// ── Update Card ────────────────────────────────────────────────────────────
function UpdateCard() {
  const [checkEnabled, setCheckEnabled] = useState(false);
  const { data, isLoading, isFetching, refetch } = useUpdateCheck(checkEnabled);

  const handleCheck = () => {
    setCheckEnabled(true);
    refetch();
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <ArrowUpCircle className="size-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Software Updates</h2>
      </div>

      {/* Status */}
      {!data && !isFetching && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Clock className="size-4 text-zinc-500 flex-shrink-0" />
          <p className="text-sm text-zinc-400">Click below to check for available updates</p>
        </div>
      )}

      {isFetching && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <RefreshCw className="size-4 text-brand-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-zinc-400">Checking for updates…</p>
        </div>
      )}

      {data && !isFetching && (
        data.upToDate ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle className="size-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">You&apos;re up to date!</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                v{data.current} is the latest {data.source === 'remote' ? 'remote' : 'local'} version
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Update available — v{data.latest}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You are on v{data.current} · Released {data.releaseDate}
                </p>
              </div>
            </div>

            {data.newVersions.map(rel => (
              <ChangelogEntry key={rel.version} release={rel} accent="amber" />
            ))}

            {data.downloadUrl && (
              <a
                href={data.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-all"
              >
                <Download className="size-4" />
                Download v{data.latest}
                <ExternalLink className="size-3" />
              </a>
            )}
            {data.releasePageUrl && !data.downloadUrl && (
              <a
                href={data.releasePageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                View release page <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )
      )}

      {data?.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <XCircle className="size-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">Check failed: {data.error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleCheck}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-sm text-zinc-300 font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          Check for Updates
        </button>
        <p className="text-xs text-zinc-600">
          {process.env.NEXT_PUBLIC_UPDATE_CHECK_URL
            ? 'Connected to remote update server'
            : 'Using local manifest · Set UPDATE_CHECK_URL for remote checks'}
        </p>
      </div>
    </section>
  );
}

// ── Backup Card ────────────────────────────────────────────────────────────
function BackupCard() {
  const { data, isLoading, refetch } = useBackups();
  const createBackup  = useCreateBackup();
  const deleteBackup  = useDeleteBackup();
  const [creating, setCreating] = useState(false);
  const [toast, setToast]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createBackup.mutateAsync('manual');
      setToast(`✓ Backup created — ${result.sizeHuman}`);
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(`✗ ${err instanceof Error ? err.message : 'Backup failed'}`);
      setTimeout(() => setToast(''), 4000);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteBackup.mutateAsync(filename);
      setConfirmDelete(null);
    } catch (err) {
      setToast(`✗ ${err instanceof Error ? err.message : 'Delete failed'}`);
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HardDrive className="size-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white">Database Backups</h2>
        </div>
        {data && (
          <span className="text-xs text-zinc-500">
            Live DB: <span className="text-zinc-300 font-medium">{data.dbSize}</span>
          </span>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
          toast.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
        )}>
          {toast}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCreate}
          disabled={creating || createBackup.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          <Database className={cn('size-3.5', (creating || createBackup.isPending) && 'animate-pulse')} />
          {creating || createBackup.isPending ? 'Creating…' : 'Create Backup Now'}
        </button>
        <button
          onClick={() => refetch()}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="size-3.5" />
        </button>
        <p className="text-xs text-zinc-600">
          Backups auto-created on startup · Kept for last 20
        </p>
      </div>

      {/* Backup list */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[0,1,2].map(i => (
              <div key={i} className="animate-pulse px-4 py-3 flex items-center gap-3">
                <div className="h-4 bg-white/5 rounded w-48" />
                <div className="h-4 bg-white/5 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : !data?.backups.length ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">
            <Database className="size-8 text-zinc-800 mx-auto mb-2" />
            No backups yet — create your first backup above
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.backups.map(backup => (
              <div key={backup.filename} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{backup.filename}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {fmtDate(backup.createdAt)} · {backup.sizeHuman}
                    {backup.tag !== 'manual' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 text-[10px]">
                        {backup.tag}
                      </span>
                    )}
                  </p>
                </div>

                {confirmDelete === backup.filename ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-red-400">Delete?</span>
                    <button
                      onClick={() => handleDelete(backup.filename)}
                      className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all"
                    >Yes</button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 rounded bg-white/[0.06] text-zinc-400 text-xs font-medium hover:bg-white/[0.10] transition-all"
                    >No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(backup.filename)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Migration Guide Card ───────────────────────────────────────────────────
function MigrationGuide() {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      title:   'Baseline existing database',
      command: 'npx prisma migrate dev --name init',
      note:    'Run once to convert from db-push to migrations. Stop dev server first.',
    },
    {
      title:   'Add a new feature (schema change)',
      command: 'npx prisma migrate dev --name add_customer_table',
      note:    'Creates a migration file + applies it to dev database.',
    },
    {
      title:   'Deploy to production / update',
      command: 'npx prisma migrate deploy',
      note:    'Applies all pending migrations safely. Run this in production or after updating the app.',
    },
    {
      title:   'Start production server (all-in-one)',
      command: 'node scripts/start.js',
      note:    'Backs up DB, runs migrations, then starts the Next.js server.',
    },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <Shield className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Migration & Deployment Guide</h2>
        </div>
        {expanded ? <ChevronDown className="size-4 text-zinc-500" /> : <ChevronRight className="size-4 text-zinc-500" />}
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-zinc-500 leading-relaxed">
            This app uses <strong className="text-zinc-300">Prisma Migrate</strong> for safe, tracked schema changes.
            Every structural change creates a migration file that can be versioned in git and deployed safely.
          </p>

          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-black/20 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-xs font-semibold text-zinc-300">{step.title}</p>
              </div>
              <code className="block bg-zinc-900 border border-white/[0.06] rounded px-3 py-1.5 text-xs text-emerald-400 font-mono">
                {step.command}
              </code>
              <p className="text-[11px] text-zinc-500 pl-7">{step.note}</p>
            </div>
          ))}

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-400 font-semibold mb-1">⚠ Windows Note</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Always run Prisma commands from <strong className="text-zinc-300">cmd.exe</strong> (not PowerShell) to avoid execution policy errors.
              Stop the dev server before running <code className="text-emerald-400">prisma generate</code> to avoid DLL lock issues.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Shared Components ──────────────────────────────────────────────────────
function ChangelogEntry({
  release,
  accent = 'indigo',
}: {
  release: { version: string; date: string; type: string; new: string[]; improved: string[]; fixed: string[] };
  accent?: string;
}) {
  const accentColor = accent === 'amber' ? 'text-amber-400' : 'text-brand-400';
  const sections: Array<{ key: keyof typeof release; label: string; color: string }> = [
    { key: 'new',      label: 'New',      color: 'text-emerald-400' },
    { key: 'improved', label: 'Improved', color: 'text-sky-400'     },
    { key: 'fixed',    label: 'Fixed',    color: 'text-amber-400'   },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-bold', accentColor)}>v{release.version}</span>
        <span className="text-[10px] text-zinc-600">{release.date}</span>
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
          release.type === 'major' ? 'bg-purple-500/10 text-purple-400'
          : release.type === 'minor' ? 'bg-sky-500/10 text-sky-400'
          : 'bg-zinc-500/10 text-zinc-400',
        )}>
          {release.type}
        </span>
      </div>
      {sections.map(({ key, label, color }) => {
        const items = release[key] as string[];
        if (!items?.length) return null;
        return (
          <div key={key}>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1', color)}>{label}</p>
            <ul className="space-y-0.5">
              {items.map((item, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                  <span className={cn('mt-1.5 size-1 rounded-full flex-shrink-0', color.replace('text-', 'bg-'))} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="size-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}
