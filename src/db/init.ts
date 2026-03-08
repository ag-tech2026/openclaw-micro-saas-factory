/**
 * Initialize Database Schema
 *
 * Run: npx tsx src/db/init.ts
 *
 * This will create all tables in the database.
 * For production, use proper migrations with drizzle-kit.
 */

import { db } from './index';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

async function initDatabase() {
  console.log('Initializing database schema...');

  try {
    // Push schema - creates tables if they don't exist
    // Note: In production with existing data, use migrations instead
    await db.run(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
    );

    // Create tables using raw SQL for better control
    // BetterAuth tables
    await createBetterAuthTables();

    // Subscription tables
    await createSubscriptionTables();

    // Add foreign key constraints after tables exist
    await addForeignKeys();

    console.log('✓ Database schema initialized successfully');
    console.log('  - BetterAuth tables: users, sessions, accounts, verification_requests');
    console.log('  - Subscription tables: customers, subscriptions, invoices, payments, subscription_events');
  } catch (error) {
    console.error('✗ Failed to initialize database:', error);
    throw error;
  } finally {
    await db.end();
  }
}

async function createBetterAuthTables() {
  console.log('  Creating BetterAuth tables...');

  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      email_verified TIMESTAMPTZ,
      name TEXT,
      first_name TEXT,
      last_name TEXT,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      role TEXT DEFAULT 'user',
      banned BOOLEAN DEFAULT FALSE,
      polar_customer_id TEXT UNIQUE
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS users_polar_customer_idx ON users(polar_customer_id);`);

  // Sessions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);`);

  // Accounts table (OAuth)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      expires_at TIMESTAMPTZ,
      password TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_idx ON accounts(provider_id, account_id);`);

  // Verification requests table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification_requests(identifier);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS verification_token_idx ON verification_requests(token);`);

  console.log('    ✓ BetterAuth tables created');
}

async function createSubscriptionTables() {
  console.log('  Creating subscription tables...');

  // Customers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      status TEXT DEFAULT 'active',
      user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      polar_metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS customers_status_idx ON customers(status);`);

  // Subscriptions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      plan_name TEXT,
      billing_interval TEXT,
      status TEXT NOT NULL,
      current_period_start TIMESTAMPTZ NOT NULL,
      current_period_end TIMESTAMPTZ NOT NULL,
      canceled_at TIMESTAMPTZ,
      polar_metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions(customer_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx ON subscriptions(current_period_end);`);

  // Invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
      number TEXT,
      status TEXT NOT NULL,
      amount_due DECIMAL(10,2) NOT NULL,
      amount_paid DECIMAL(10,2) DEFAULT 0,
      currency TEXT DEFAULT 'usd',
      due_date TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices(customer_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS invoices_paid_at_idx ON invoices(paid_at);`);

  // Payments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'usd',
      status TEXT NOT NULL,
      payment_method_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS payments_customer_idx ON payments(customer_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);`);

  // Subscription events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscription_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      data JSONB NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS events_type_idx ON subscription_events(type);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS events_source_idx ON subscription_events(source);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS events_processed_idx ON subscription_events(processed);`);

  console.log('    ✓ Subscription tables created');
}

async function addForeignKeys() {
  // Foreign keys were added inline in table creation
  console.log('    ✓ Foreign keys configured');
}

// Run if called directly
if (require.main === module) {
  initDatabase().catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

export { initDatabase };
