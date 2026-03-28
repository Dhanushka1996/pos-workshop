import { NextResponse } from 'next/server';
import path from 'path';
import fs   from 'fs';

const ROOT         = path.resolve(process.cwd());
const versionPath  = path.join(ROOT, 'version.json');
const changelogPath = path.join(ROOT, 'changelog.json');

export async function GET() {
  try {
    const version   = JSON.parse(fs.readFileSync(versionPath,   'utf-8'));
    const changelog = fs.existsSync(changelogPath)
      ? JSON.parse(fs.readFileSync(changelogPath, 'utf-8'))
      : { releases: [] };

    return NextResponse.json({
      version:      version.version,
      buildDate:    version.buildDate,
      channel:      version.channel ?? 'stable',
      releaseNotes: version.releaseNotes ?? '',
      changelog:    changelog.releases ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not read version information' },
      { status: 500 },
    );
  }
}
