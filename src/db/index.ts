/**
 * Database Client
 * Uses Neon serverless driver with Drizzle ORM
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm';
import * as schema from './schema';

// Create Neon HTTP client (serverless, no connection pooling needed)
const sql = neon(process.env.DATABASE_URL!);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Export all schema components for convenient imports
export * from './schema';
export * from 'drizzle-orm';
