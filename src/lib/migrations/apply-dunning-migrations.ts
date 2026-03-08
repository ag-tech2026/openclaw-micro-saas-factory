/**
 * Apply Payment Retry & Dunning Database Migrations
 * Run this script to create the necessary tables and columns
 *
 * Usage: npx ts-node src/lib/migrations/apply-dunning-migrations.ts
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to database');

    // Read the SQL migration file
    const migrationPath = join(process.cwd(), 'drizzle', '0001_payment_retry_dunning.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration...');
    await pool.query(sql);
    console.log('✓ Migration applied successfully');

    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('payment_retry_attempts', 'dunning_events')
      ORDER BY table_name;
    `);

    console.log('\nCreated tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Verify columns were added
    console.log('\nVerifying added columns:');
    const customerCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
        AND column_name IN ('dunning_status', 'last_payment_failed_at', 'failed_payment_count', 'dunning_emails_sent');
    `);
    console.log('  Customers table:');
    customerCols.rows.forEach((col: any) => console.log(`    ✓ ${col.column_name}`));

    const subCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
        AND column_name IN ('retry_attempts', 'last_retry_at', 'canceled_due_to_dunning', 'dunning_grace_period_ends');
    `);
    console.log('  Subscriptions table:');
    subCols.rows.forEach((col: any) => console.log(`    ✓ ${col.column_name}`));

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigrations().catch(console.error);
