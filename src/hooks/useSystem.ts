import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────

export interface VersionInfo {
  version:      string;
  buildDate:    string;
  channel:      string;
  releaseNotes: string;
  changelog: Array<{
    version:  string;
    date:     string;
    type:     string;
    new:      string[];
    improved: string[];
    fixed:    string[];
  }>;
}

export interface BackupEntry {
  filename:  string;
  size:      number;
  sizeHuman: string;
  createdAt: string;
  tag:       string;
}

export interface BackupList {
  backups:   BackupEntry[];
  dbSize:    string;
  backupDir: string;
}

export interface UpdateCheckResult {
  upToDate:       boolean;
  current:        string;
  latest:         string;
  source:         'remote' | 'local' | 'none';
  downloadUrl?:   string;
  releasePageUrl?: string;
  releaseDate?:   string;
  newVersions: Array<{
    version:  string;
    date:     string;
    type:     string;
    new:      string[];
    improved: string[];
    fixed:    string[];
  }>;
  error?: string;
}

// ── useVersion ─────────────────────────────────────────────────────────────
export function useVersion() {
  return useQuery<VersionInfo>({
    queryKey: ['system', 'version'],
    queryFn:  async () => {
      const res = await fetch('/api/system/version');
      if (!res.ok) throw new Error('Failed to fetch version');
      return res.json();
    },
    staleTime: Infinity,   // version doesn't change at runtime
  });
}

// ── useBackups ─────────────────────────────────────────────────────────────
export function useBackups() {
  return useQuery<BackupList>({
    queryKey: ['system', 'backups'],
    queryFn:  async () => {
      const res = await fetch('/api/system/backup');
      if (!res.ok) throw new Error('Failed to list backups');
      return res.json();
    },
  });
}

// ── useCreateBackup ────────────────────────────────────────────────────────
export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tag: string = 'manual') => {
      const res = await fetch('/api/system/backup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tag }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Backup failed');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'backups'] }),
  });
}

// ── useDeleteBackup ────────────────────────────────────────────────────────
export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/system/backup?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'backups'] }),
  });
}

// ── useUpdateCheck ─────────────────────────────────────────────────────────
export function useUpdateCheck(enabled = false) {
  return useQuery<UpdateCheckResult>({
    queryKey: ['system', 'update-check'],
    queryFn:  async () => {
      const res = await fetch('/api/system/update');
      if (!res.ok) throw new Error('Update check failed');
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,   // cache for 5 minutes
    retry:     false,
  });
}
