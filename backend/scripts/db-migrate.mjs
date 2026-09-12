#!/usr/bin/env node
// Applies every file in src/db/migrations (in file-name order) to the D1 database.
//
//   npm run db:migrate:local    # local dev database (default)
//   npm run db:migrate          # remote/production database
//
// All migrations are written to be idempotent (CREATE TABLE IF NOT EXISTS /
// UPDATE ... WHERE), so running this again is safe — it only picks up what is
// still missing. This exists because a forgotten migration makes the matching
// feature fail at runtime with a confusing "no such table" error.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_NAME = 'freebuff-tickets-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const migrationsDir = join(backendRoot, 'src', 'db', 'migrations');

const remote = process.argv.includes('--remote');

if (remote) {
  console.log('⚠️  Applying migrations to the REMOTE database (production).');
}

// مسیر CLI محلی wrangler (بدون نیاز به shell و npx)
const wranglerCli = join(backendRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wranglerCli)) {
  console.error('✖ wrangler نصب نیست. ابتدا `npm install` را در پوشه backend اجرا کنید.');
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migrations found in src/db/migrations.');
  process.exit(0);
}

for (const file of files) {
  const relative = join('src', 'db', 'migrations', file);
  const args = ['d1', 'execute', DB_NAME];

  if (!remote) args.push('--local');
  args.push('--file', `./${relative.replaceAll('\\', '/')}`);

  console.log(`\n▶ ${relative}`);

  const result = spawnSync(process.execPath, [wranglerCli, ...args], {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(`\n✖ Migration failed: ${relative}`);
    process.exit(result.status || 1);
  }
}

console.log(`\n✔ همه migration ها اعمال شدند (${files.length} فایل).`);
