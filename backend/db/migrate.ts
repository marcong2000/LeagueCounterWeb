/**
 * Phase 2 migration runner (scaffold — not used in Phase 1).
 *
 * Applies backend/db/schema.sql to the database in $DATABASE_URL.
 * Idempotent: schema.sql uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage:  DATABASE_URL=postgres://… npm run db:migrate
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';
import { getDatabaseUrl } from '../config';

async function main() {
  const databaseUrl = getDatabaseUrl();
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(here, 'schema.sql'), 'utf8');

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    console.log('Applying schema.sql …');
    await pool.query(sql);
    console.log('Migration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
