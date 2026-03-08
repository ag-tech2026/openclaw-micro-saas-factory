import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbSchema } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, {
  schema: dbSchema,
  logger: process.env.NODE_ENV === 'development',
});

// Test connection on startup
pool.query('SELECT NOW()').then(() => {
  console.log('[Drizzle] ✓ Connected to PostgreSQL database');
}).catch((err) => {
  console.error('[Drizzle] ✗ Database connection failed:', err.message);
});
