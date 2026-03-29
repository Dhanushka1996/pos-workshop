import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs   from 'fs';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// We call the backup utility directly (server-side Node.js only)
const ROOT       = path.resolve(process.cwd());
const DB_PATH    = path.join(ROOT, 'prisma', 'dev.db');
const BACKUP_DIR = path.join(ROOT, 'backups');

// ── Helpers ────────────────────────────────────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db') && f.startsWith('backup_'))
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat     = fs.statSync(filePath);
      const match    = filename.match(/^backup_[\d-]+_[\d-]+_(.+)\.db$/);
      const tag      = match ? match[1].replace(/_/g, ' ') : 'manual';
      return {
        filename,
        size:      stat.size,
        sizeHuman: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        tag,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── GET — List all backups ──────────────────────────────────────────────────
export async function GET() {
  try {
    const backups  = listBackups();
    const dbExists = fs.existsSync(DB_PATH);
    const dbSize   = dbExists ? formatBytes(fs.statSync(DB_PATH).size) : '0 B';

    return NextResponse.json({ backups, dbSize, backupDir: BACKUP_DIR });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

// ── POST — Create a new backup ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tag  = (body.tag as string | undefined)?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'manual';

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    ensureBackupDir();

    const now  = new Date();
    const ts   = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const filename = `backup_${ts}_${tag}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    fs.copyFileSync(DB_PATH, destPath);
    const stat = fs.statSync(destPath);

    // Auto-prune: keep last 20 backups
    const all = listBackups();
    all.slice(20).forEach(b => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, b.filename)); } catch {}
    });

    return NextResponse.json({
      success:  true,
      filename,
      size:     stat.size,
      sizeHuman: formatBytes(stat.size),
      createdAt: stat.mtime.toISOString(),
      tag,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Backup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE — Remove a backup ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    // Security: strip path separators, only allow files in BACKUP_DIR
    const safe     = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safe);
    if (!filePath.startsWith(BACKUP_DIR)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
