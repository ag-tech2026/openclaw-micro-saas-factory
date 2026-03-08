import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default {
  schema: './src/lib/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  url: connectionString,
} satisfies Config;
