#!/usr/bin/env node
/**
 * Production Startup Script
 * ─────────────────────────
 * 1. Prints version banner
 * 2. Creates a pre-start database backup
 * 3. Runs pending Prisma migrations (safe, idempotent)
 * 4. Starts the Next.js production server
 *
 * Usage:
 *   node scripts/start.js
 *   node scripts/start.js --no-backup   (skip backup step)
 *   node scripts/start.js --port 3001   (custom port)
 */

const { execSync, spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');

const ROOT    = path.resolve(__dirname, '..');
const VERSION = require(path.join(ROOT, 'version.json'));

// ── CLI flags ──────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const noBackup   = args.includes('--no-backup');
const portFlag   = args.indexOf('--port');
const PORT       = portFlag !== -1 ? args[portFlag + 1] : (process.env.PORT || 3000);

// ── Helpers ────────────────────────────────────────────────────────────────
function log(msg, color = '\x1b[0m') {
  console.log(`${color}[POS] ${msg}\x1b[0m`);
}
const green  = '\x1b[32m';
const yellow = '\x1b[33m';
const cyan   = '\x1b[36m';
const red    = '\x1b[31m';

// ── Banner ─────────────────────────────────────────────────────────────────
console.log('\x1b[36m');
console.log('╔════════════════════════════════════════╗');
console.log(`║   POS + Workshop  v${VERSION.version.padEnd(20)}║`);
console.log(`║   Build: ${VERSION.buildDate.padEnd(30)}║`);
console.log('╚════════════════════════════════════════╝');
console.log('\x1b[0m');

// ── Step 1: Backup ─────────────────────────────────────────────────────────
if (!noBackup) {
  try {
    log('Creating pre-start database backup…', yellow);
    const { createBackup } = require('./backup.js');
    const backupPath = createBackup('auto-start');
    log(`✓ Backup saved → ${path.relative(ROOT, backupPath)}`, green);
  } catch (err) {
    log(`⚠ Backup skipped: ${err.message}`, yellow);
  }
} else {
  log('Skipping backup (--no-backup flag)', yellow);
}

// ── Step 2: Run migrations ─────────────────────────────────────────────────
log('Running database migrations…', cyan);
try {
  execSync('npx prisma migrate deploy', {
    cwd:   ROOT,
    stdio: 'inherit',
    env:   { ...process.env },
  });
  log('✓ Database is up to date', green);
} catch {
  // If no migrations directory exists yet, fall back to db push (dev mode)
  log('No migration history found — running db push (development mode)…', yellow);
  try {
    execSync('npx prisma db push --accept-data-loss', {
      cwd:   ROOT,
      stdio: 'inherit',
      env:   { ...process.env },
    });
    log('✓ Schema synced via db push', green);
  } catch (err2) {
    log(`✗ Migration failed: ${err2.message}`, red);
    log('The app will still start — but the database may be out of date.', yellow);
  }
}

// ── Step 3: Start Next.js ──────────────────────────────────────────────────
log(`Starting server on port ${PORT}…`, cyan);

const server = spawn('npx', ['next', 'start', '--port', String(PORT)], {
  cwd:   ROOT,
  stdio: 'inherit',
  env:   { ...process.env, PORT: String(PORT) },
  shell: true,
});

server.on('error', (err) => {
  log(`✗ Failed to start server: ${err.message}`, red);
  process.exit(1);
});

server.on('close', (code) => {
  log(`Server exited with code ${code}`, code === 0 ? green : red);
  process.exit(code ?? 0);
});

// Graceful shutdown
process.on('SIGINT',  () => { server.kill('SIGINT');  });
process.on('SIGTERM', () => { server.kill('SIGTERM'); });
