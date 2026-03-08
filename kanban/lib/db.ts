import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export type Subscriber = {
  id: number;
  email: string;
  subscribed_at: Date;
  source?: string;
  unsubscribed_at?: Date | null;
  sent_welcome_email: boolean;
};

export const db = {
  // Initialize database schema
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        source VARCHAR(100),
        unsubscribed_at TIMESTAMP NULL,
        sent_welcome_email BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
  },

  // Subscribe a new email
  async subscribe(email: string, source?: string): Promise<Subscriber | null> {
    try {
      const result = await pool.query<Subscriber>(
        `INSERT INTO subscribers (email, source, subscribed_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (email) 
         WHERE unsubscribed_at IS NULL OR unsubscribed_at IS NOT NULL
         DO UPDATE SET 
           unsubscribed_at = NULL,
           subscribed_at = NOW()
         RETURNING *`,
        [email, source]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Subscribe error:', error);
      return null;
    }
  },

  // Unsubscribe by email
  async unsubscribe(email: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE subscribers 
       SET unsubscribed_at = NOW() 
       WHERE email = $1 AND unsubscribed_at IS NULL 
       RETURNING id`,
      [email]
    );
    return result.rows.length > 0;
  },

  // Get all active subscribers
  async getActiveSubscribers(): Promise<Subscriber[]> {
    const result = await pool.query<Subscriber>(
      `SELECT * FROM subscribers 
       WHERE unsubscribed_at IS NULL 
       ORDER BY subscribed_at DESC`
    );
    return result.rows;
  },

  // Get subscriber by email
  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    const result = await pool.query<Subscriber>(
      'SELECT * FROM subscribers WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  // Mark welcome email as sent
  async markWelcomeSent(email: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE subscribers 
       SET sent_welcome_email = TRUE 
       WHERE email = $1 
       RETURNING id`,
      [email]
    );
    return result.rows.length > 0;
  },

  // Get statistics
  async getStats() {
    const total = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM subscribers'
    );
    const active = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM subscribers WHERE unsubscribed_at IS NULL'
    );
    const welcomed = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM subscribers WHERE sent_welcome_email = TRUE'
    );
    return {
      total: parseInt(total.rows[0].count),
      active: parseInt(active.rows[0].count),
      welcomed: parseInt(welcomed.rows[0].count),
    };
  },

  // Get subscribers who haven't received welcome email
  async getPendingWelcome(): Promise<Subscriber[]> {
    const result = await pool.query<Subscriber>(
      `SELECT * FROM subscribers 
       WHERE unsubscribed_at IS NULL 
         AND sent_welcome_email = FALSE`
    );
    return result.rows;
  },
};

// Initialize on import
db.init().catch(console.error);
