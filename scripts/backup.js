#!/usr/bin/env node
/**
 * Database Backup Utility
 * ───────────────────────
 * Creates timestamped copies of the SQLite database.
 *
 * Usage (CLI):
 *   node scripts/backup.js                  → creates a manual backup
 *   node scripts/backup.js --tag pre-update → tagged backup
 *   node scripts/backup.js --list           → list all backups
 *   node scripts/backup.js --prune 10       → keep only last 10 backups
 *
 * Usage (module):
 *   const { createBackup, listBackups, pruneBackups } = require('./backup.js');
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const DB_PATH     = path.join(ROOT, 'prisma', 'dev.db');
const BACKUP_DIR  = path.join(ROOT, 'backups');
const MAX_BACKUPS = 20;   // Auto-prune threshold

// ── Ensure backup dir exists ───────────────────────────────────────────────
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a timestamped backup of the database.
 * @param {string} [tag] - Optional tag appended to filename (e.g. 'pre-update')
 * @returns {string} Absolute path to the backup file
 */
function createBackup(tag = 'manual') {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}`);
  }

  const now  = new Date();
  const ts   = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);            // 2026-03-27_14-30-00

  const safetag  = tag.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const filename = `backup_${ts}_${safetag}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  fs.copyFileSync(DB_PATH, destPath);

  // Auto-prune old backups (keep most recent MAX_BACKUPS)
  pruneBackups(MAX_BACKUPS);

  return destPath;
}

/**
 * List all backups, newest first.
 * @returns {Array<{filename, path, size, createdAt, tag}>}
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db') && f.startsWith('backup_'))
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat     = fs.statSync(filePath);
      // Parse tag from filename: backup_2026-03-27_14-30-00_manual.db
      const match    = filename.match(/^backup_[\d-]+_[\d-]+_(.+)\.db$/);
      const tag      = match ? match[1] : 'unknown';
      return {
        filename,
        path:      filePath,
        size:      stat.size,
        sizeHuman: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        tag,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Delete a specific backup by filename.
 * @param {string} filename
 */
function deleteBackup(filename) {
  // Security: only allow deleting files in the backups dir
  const filePath = path.join(BACKUP_DIR, path.basename(filename));
  if (!filePath.startsWith(BACKUP_DIR)) {
    throw new Error('Invalid backup path');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup not found: ${filename}`);
  }
  fs.unlinkSync(filePath);
}

/**
 * Restore a backup over the current database.
 * IMPORTANT: This overwrites the live database — caller must confirm.
 * @param {string} filename
 */
function restoreBackup(filename) {
  const filePath = path.join(BACKUP_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup not found: ${filename}`);
  }
  // Before restoring, back up the current state
  createBackup('pre-restore');
  fs.copyFileSync(filePath, DB_PATH);
}

/**
 * Keep only the N most recent backups, delete the rest.
 * @param {number} keep
 */
function pruneBackups(keep = MAX_BACKUPS) {
  const all = listBackups();
  const toDelete = all.slice(keep);
  toDelete.forEach(b => {
    try { fs.unlinkSync(b.path); } catch {}
  });
  return toDelete.length;
}

function formatBytes(bytes) {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── CLI mode ───────────────────────────────────────────────────────────────
if (require.main === module) {
  const args   = process.argv.slice(2);
  const green  = '\x1b[32m';
  const yellow = '\x1b[33m';
  const reset  = '\x1b[0m';

  if (args.includes('--list')) {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log('No backups found.');
    } else {
      console.log(`\n${backups.length} backup(s) found:\n`);
      backups.forEach((b, i) => {
        const date = new Date(b.createdAt).toLocaleString();
        console.log(`  ${i + 1}. ${green}${b.filename}${reset}`);
        console.log(`     Size: ${b.sizeHuman}  |  Created: ${date}  |  Tag: ${b.tag}`);
      });
      console.log();
    }
  } else if (args.includes('--prune')) {
    const keepIdx  = args.indexOf('--prune');
    const keep     = parseInt(args[keepIdx + 1]) || MAX_BACKUPS;
    const deleted  = pruneBackups(keep);
    console.log(`${yellow}Pruned ${deleted} old backup(s) (keeping latest ${keep})${reset}`);
  } else {
    const tagIdx = args.indexOf('--tag');
    const tag    = tagIdx !== -1 ? args[tagIdx + 1] : 'manual';
    try {
      const dest = createBackup(tag);
      console.log(`${green}✓ Backup created: ${path.relative(process.cwd(), dest)}${reset}`);
    } catch (err) {
      console.error(`\x1b[31m✗ Backup failed: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  }
}

module.exports = { createBackup, listBackups, deleteBackup, restoreBackup, pruneBackups };
