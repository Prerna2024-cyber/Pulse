import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set (check .env)');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// See worker/db.js for why this listener matters: without it, an idle
// connection drop is an unhandled EventEmitter error and crashes the process.
pool.on('error', (err) => {
  console.error('[db] idle client error (pool recovers automatically):', err.message);
});
