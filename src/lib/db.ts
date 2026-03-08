import Database from 'better-sqlite3';
import path from 'path';
import { env } from '@/lib/config';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'db.sqlite');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Affiliates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS affiliates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      referred_count INTEGER DEFAULT 0,
      commission_amount REAL DEFAULT 0.0,
      commission_rate REAL DEFAULT 0.1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Referrals table - tracks who referred whom
  db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      referral_code TEXT NOT NULL,
      converted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referral_code) REFERENCES affiliates(code) ON DELETE CASCADE,
      UNIQUE(referred_id)
    )
  `);

  // Commission transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS commission_transactions (
      id TEXT PRIMARY KEY,
      affiliate_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      payout_method TEXT,
      payout_id TEXT,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
    )
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
    CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
    CREATE INDEX IF NOT EXISTS idx_commission_affiliate ON commission_transactions(affiliate_id);
  `);

  console.log('Database initialized successfully');
}

// Generate unique referral code
export function generateReferralCode(userId: string): string {
  // Check if affiliate already exists
  const existing = db.prepare('SELECT code FROM affiliates WHERE user_id = ?').get(userId);
  if (existing) {
    return existing.code;
  }

  // Generate unique code
  const baseCode = generateBaseCode();
  const code = ensureUniqueCode(baseCode);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO affiliates (id, user_id, code)
    VALUES (?, ?, ?)
  `).run(id, userId, code);

  return code;
}

function generateBaseCode(): string {
  const adjectives = ['cool', 'smart', 'fast', 'wise', 'brave', 'swift', 'sharp', 'neat', 'proud', 'kind'];
  const nouns = ['panda', 'eagle', 'tiger', 'lion', 'fox', 'owl', 'bear', 'hawk', 'wolf', 'deer'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`.toLowerCase();
}

function ensureUniqueCode(baseCode: string, maxAttempts = 10): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = i === 0 ? baseCode : `${baseCode}${i}`;
    const existing = db.prepare('SELECT 1 FROM affiliates WHERE code = ?').get(code);
    if (!existing) {
      return code;
    }
  }
  // Fallback: use UUID
  return crypto.randomUUID().slice(0, 8).toLowerCase();
}

// Validate referral code
export function validateReferralCode(code: string): { valid: boolean; affiliate?: any; error?: string } {
  if (!code || typeof code !== 'string' || code.length < 3) {
    return { valid: false, error: 'Invalid referral code format' };
  }

  const affiliate = db.prepare(`
    SELECT a.*, u.email, u.name
    FROM affiliates a
    JOIN users u ON a.user_id = u.id
    WHERE a.code = ? AND a.is_active = 1
  `).get(code);

  if (!affiliate) {
    return { valid: false, error: 'Referral code not found or inactive' };
  }

  return { valid: true, affiliate };
}

// Record a referral (when new user signs up with code)
export function recordReferral(
  referralCode: string,
  referredUserId: string
): { success: boolean; error?: string; referrer?: any } {
  const validation = validateReferralCode(referralCode);
  if (!validation.valid || !validation.affiliate) {
    return { success: false, error: validation.error };
  }

  const affiliate = validation.affiliate;

  // Prevent self-referral
  if (affiliate.user_id === referredUserId) {
    return { success: false, error: 'Self-referral not allowed' };
  }

  // Check if user already referred by someone else
  const existingReferral = db.prepare('SELECT 1 FROM referrals WHERE referred_id = ?').get(referredUserId);
  if (existingReferral) {
    return { success: false, error: 'User already has a referrer' };
  }

  const referralId = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertReferral = db.prepare(`
    INSERT INTO referrals (id, referrer_id, referred_id, referral_code, converted_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateAffiliate = db.prepare(`
    UPDATE affiliates
    SET referred_count = referred_count + 1,
        updated_at = ?
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertReferral.run(referralId, affiliate.user_id, referredUserId, referralCode, now, now);
    updateAffiliate.run(now, affiliate.id);
  });

  try {
    transaction();
    return {
      success: true,
      referrer: {
        id: affiliate.user_id,
        name: affiliate.name,
        email: affiliate.email,
        code: affiliate.code,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get affiliate stats for a user
export function getAffiliateStats(userId: string) {
  const affiliate = db.prepare(`
    SELECT * FROM affiliates WHERE user_id = ?
  `).get(userId);

  if (!affiliate) {
    return null;
  }

  // Get referral list
  const referrals = db.prepare(`
    SELECT r.*, u.email, u.name, u.created_at as referred_at
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(userId);

  // Get commission transactions
  const commissions = db.prepare(`
    SELECT * FROM commission_transactions
    WHERE affiliate_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(affiliate.id);

  const totalCommission = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM commission_transactions
    WHERE affiliate_id = ? AND status = 'processed'
  `).get(affiliate.id).total;

  return {
    affiliate,
    referrals,
    commissions,
    totalCommission,
    stats: {
      totalReferrals: referrals.length,
      pendingCommission: commissionSum('pending', affiliate.id),
      processedCommission: totalCommission,
    },
  };
}

function commissionSum(status: string, affiliateId: string): number {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM commission_transactions
    WHERE affiliate_id = ? AND status = ?
  `).get(affiliateId, status);
  return result.total;
}

// Create commission transaction (called when a referral makes a payment)
export function createCommission(
  affiliateId: string,
  amount: number,
  description: string,
  metadata?: Record<string, any>
): string {
  const commissionRate = db.prepare('SELECT commission_rate FROM affiliates WHERE id = ?').get(affiliateId).commission_rate;
  const commissionAmount = amount * commissionRate;

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO commission_transactions (id, affiliate_id, amount, status, description, metadata, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `).run(transactionId, affiliateId, commissionAmount, description, metadata ? JSON.stringify(metadata) : null, now);

  return transactionId;
}

// Process payout (mark commission as paid)
export function processPayout(
  transactionId: string,
  payoutMethod: 'stripe' | 'polar' | 'credit',
  payoutId?: string
): boolean {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE commission_transactions
    SET status = 'processed',
        processed_at = ?,
        payout_method = ?,
        payout_id = ?
    WHERE id = ? AND status = 'pending'
  `).run(now, payoutMethod, payoutId, transactionId);

  // If payout is credit, apply to user's account balance table (if exists)
  if (payoutMethod === 'credit') {
    // Future: update user balance in a separate table
  }

  return true;
}

// Get all affiliates (admin)
export function getAllAffiliates(limit = 100, offset = 0) {
  return db.prepare(`
    SELECT a.*, u.email, u.name
    FROM affiliates a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.referred_count DESC, a.commission_amount DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

// Cleanup: Ensure database is properly closed on exit
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
