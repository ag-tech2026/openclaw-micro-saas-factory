import { Pool } from 'pg';
import { env } from '@/lib/config';

/**
 * PostgreSQL connection pool for subscription analytics
 * Uses Neon DB connection string from DATABASE_URL env var
 */

const connectionString = process.env.DATABASE_URL;

let subscriptionDb: Pool | { query: (...args: any[]) => Promise<any> };

if (!connectionString) {
  console.warn('DATABASE_URL not set. Subscription analytics will not be available.');
  // Assign a mock pool that throws informative errors
  subscriptionDb = {
    query: async () => {
      throw new Error('DATABASE_URL environment variable is required for subscription analytics. Please configure your Neon DB connection.');
    },
  };
} else {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection on startup
  pool.query('SELECT NOW()').then(() => {
    console.log('✓ Connected to Neon DB (PostgreSQL) for subscription analytics');
  }).catch((err) => {
    console.error('✗ Failed to connect to Neon DB:', err.message);
  });

  subscriptionDb = pool;
}

export { subscriptionDb };
