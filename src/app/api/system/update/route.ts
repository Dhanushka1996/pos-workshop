import { NextResponse } from 'next/server';
import path from 'path';
import fs   from 'fs';

export const dynamic = 'force-dynamic';

const ROOT          = path.resolve(process.cwd());
const LOCAL_MANIFEST = path.join(ROOT, 'update-manifest.json');
const VERSION_FILE   = path.join(ROOT, 'version.json');

// ── Semver comparison (no external dep needed) ─────────────────────────────
function parseVersion(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function isNewer(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = parseVersion(a);
  const [bMaj, bMin, bPat] = parseVersion(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat > bPat;
}

// ── GET — Check for updates ────────────────────────────────────────────────
export async function GET() {
  try {
    const versionInfo = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
    const current     = versionInfo.version as string;

    let manifest: Record<string, unknown> | null = null;

    // 1. Try remote manifest first (if configured)
    const remoteUrl = process.env.UPDATE_CHECK_URL;
    if (remoteUrl) {
      try {
        const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) manifest = await res.json();
      } catch {
        // Remote unreachable — fall through to local
      }
    }

    // 2. Fall back to local manifest
    if (!manifest && fs.existsSync(LOCAL_MANIFEST)) {
      manifest = JSON.parse(fs.readFileSync(LOCAL_MANIFEST, 'utf-8'));
    }

    if (!manifest) {
      return NextResponse.json({
        upToDate:    true,
        current,
        latest:      current,
        source:      'none',
        changelog:   [],
      });
    }

    const latest      = manifest.latest as string;
    const upToDate    = !isNewer(latest, current);
    const source      = remoteUrl && manifest ? 'remote' : 'local';

    // Collect changelogs for versions newer than current
    const allChangelog = manifest.changelog as Record<string, {
      date: string; type: string;
      new: string[]; improved: string[]; fixed: string[];
    }> ?? {};

    const newVersions = Object.entries(allChangelog)
      .filter(([ver]) => isNewer(ver, current))
      .sort(([a], [b]) => isNewer(a, b) ? -1 : 1)
      .map(([ver, log]) => ({ version: ver, ...log }));

    return NextResponse.json({
      upToDate,
      current,
      latest,
      source,
      downloadUrl:     manifest.downloadUrl    ?? '',
      releasePageUrl:  manifest.releasePageUrl ?? '',
      releaseDate:     manifest.releaseDate     ?? '',
      newVersions,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
