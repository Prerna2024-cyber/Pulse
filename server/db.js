import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Railway exposes the database twice: a private-network address that never
// leaves their infrastructure, and a public proxy. Prefer the private one --
// it's faster, doesn't burn proxy bandwidth, and isn't reachable from the
// internet at all. DATABASE_URL remains the fallback for local development,
// where only the public proxy exists.
//
// Railway's own variable naming has varied (DATABASE_PRIVATE_URL in some
// templates, DATABASE_URL pointing at the private host in others), so both
// names are accepted rather than betting on one.
const connectionString = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_PRIVATE_URL or DATABASE_URL must be set (check .env)');
}

export const pool = new Pool({ connectionString });

// See worker/db.js for why this listener matters: without it, an idle
// connection drop is an unhandled EventEmitter error and crashes the process.
pool.on('error', (err) => {
  console.error('[db] idle client error (pool recovers automatically):', err.message);
});
