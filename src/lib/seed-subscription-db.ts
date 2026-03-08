/**
 * Seed subscription analytics database with sample data
 * This creates dummy subscriptions, customers, and invoices for testing the dashboard
 */

import { subscriptionDb } from './subscription-db';

// Simple seed data for testing
async function seedSimple() {
  console.log('Creating simple sample data...');

  const now = new Date();

  // Create some customers
  const customer1 = { id: 'cust_001', email: 'alice@example.com', name: 'Alice Johnson' };
  const customer2 = { id: 'cust_002', email: 'bob@example.com', name: 'Bob Smith' };
  const customer3 = { id: 'cust_003', email: 'charlie@example.com', name: 'Charlie Brown' };

  for (const c of [customer1, customer2, customer3]) {
    await subscriptionDb.query(`
      INSERT INTO customers (id, email, name, status) VALUES ($1, $2, $3, 'active')
      ON CONFLICT (id) DO NOTHING
    `, [c.id, c.email, c.name]);
  }

  // Create subscriptions with different statuses and dates
  const subscriptions = [
    {
      id: 'sub_001',
      customer_id: 'cust_001',
      plan_id: 'plan_pro',
      plan_name: 'Pro',
      billing_interval: 'month',
      status: 'active',
      current_period_start: new Date(now.getFullYear(), now.getMonth(), 1),
      current_period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      canceled_at: null,
      created_at: new Date(now.getFullYear(), now.getMonth() - 2, 15),
    },
    {
      id: 'sub_002',
      customer_id: 'cust_002',
      plan_id: 'plan_basic',
      plan_name: 'Basic',
      billing_interval: 'month',
      status: 'canceled',
      current_period_start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      current_period_end: new Date(now.getFullYear(), now.getMonth(), 0),
      canceled_at: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      created_at: new Date(now.getFullYear(), now.getMonth() - 3, 1),
    },
    {
      id: 'sub_003',
      customer_id: 'cust_003',
      plan_id: 'plan_enterprise',
      plan_name: 'Enterprise',
      billing_interval: 'year',
      status: 'active',
      current_period_start: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      current_period_end: new Date(now.getFullYear() + 1, now.getMonth(), 0),
      canceled_at: null,
      created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1),
    },
  ];

  for (const sub of subscriptions) {
    await subscriptionDb.query(`
      INSERT INTO subscriptions (
        id, customer_id, plan_id, plan_name, billing_interval,
        status, current_period_start, current_period_end, canceled_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      sub.id,
      sub.customer_id,
      sub.plan_id,
      sub.plan_name,
      sub.billing_interval,
      sub.status,
      sub.current_period_start,
      sub.current_period_end,
      sub.canceled_at,
      sub.created_at,
    ]);

    // Create invoice
    const invoiceId = `inv_${sub.id}`;
    const amountDue = sub.plan_name === 'Basic' ? 29 : sub.plan_name === 'Pro' ? 79 : 199;
    await subscriptionDb.query(`
      INSERT INTO invoices (
        id, customer_id, subscription_id, status, amount_due, amount_paid, currency, paid_at
      ) VALUES ($1, $2, $3, 'paid', $4, $4, 'usd', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [invoiceId, sub.customer_id, sub.id, amountDue]);

    // Create payment
    const paymentId = `pay_${sub.id}`;
    await subscriptionDb.query(`
      INSERT INTO payments (id, customer_id, invoice_id, amount, status, payment_method_type)
      VALUES ($1, $2, $3, $4, 'succeeded', 'card')
      ON CONFLICT (id) DO NOTHING
    `, [paymentId, sub.customer_id, invoiceId, amountDue]);
  }

  console.log('✅ Simple sample data created (3 subscriptions)');
}

if (require.main === module) {
  // Run simple seed by default (no faker dependency)
  seedSimple().then(() => {
    console.log('Sample data initialization complete');
    process.exit(0);
  });
}

export { seedSimple };
