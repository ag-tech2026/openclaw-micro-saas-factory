import { z } from 'zod';

/**
 * Environment variables schema validation
 * All required env vars are defined here with proper types
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Admin
  RATE_LIMIT_ADMIN_SECRET: z.string().default('admin-secret-change-me'),

  // Analytics
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_API_HOST: z.string().url().default('https://plausible.io'),
  ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('true'),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform((val) => parseFloat(val)).default('0.1'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().transform((val) => parseFloat(val)).optional(),
  NEXT_PUBLIC_ENABLE_ERROR_MONITORING: z.string().transform((val) => val === 'true').default('true'),
  ENABLE_ERROR_MONITORING: z.string().transform((val) => val === 'true').default('true'),

  // AI APIs
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Social Media APIs
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_SECRET: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // Buffer (optional social media scheduler)
  BUFFER_API_KEY: z.string().optional(),

  // Polar
  POLAR_CLIENT_ID: z.string().optional(),
  POLAR_CLIENT_SECRET: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_SECRET: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // GitHub
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Email (Resend)
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),

  // Email Dead Letter Queue Configuration
  EMAIL_DLQ_MAX_RETRIES: z.string().transform((val) => parseInt(val, 10)).default('7'),
  EMAIL_DLQ_BACKOFF_SCHEDULE: z.string().default('5m,15m,30m,1h,2h,4h,8h'),
  EMAIL_DLQ_ALERT_THRESHOLD: z.string().transform((val) => parseInt(val, 10)).default('100'),
  EMAIL_DLQ_RETRY_INTERVAL: z.string().default('15m'),

  // Alert Configuration
  ALERT_EMAIL_TO: z.string().email().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // PDF Invoice Configuration (optional)
  COMPANY_NAME: z.string().optional(),
  COMPANY_LOGO_URL: z.string().url().optional(),
  COMPANY_ADDRESS: z.string().optional(),
  COMPANY_EMAIL: z.string().email().optional(),
  COMPANY_PHONE: z.string().optional(),

  // Webhook Security
  WEBHOOK_ENFORCE_IP_ALLOWLIST: z.string().transform((val) => val === 'true').default('false'),

  // Health Monitoring - Alert Thresholds
  HEALTH_ALERT_DB_LATENCY_MS: z.string().transform((val) => parseInt(val, 10)).default('200'),
  HEALTH_ALERT_ERROR_RATE_PCT: z.string().transform((val) => parseFloat(val)).default('5'),
  HEALTH_ALERT_CPU_PCT: z.string().transform((val) => parseInt(val, 10)).default('80'),
  HEALTH_ALERT_DISK_PCT: z.string().transform((val) => parseInt(val, 10)).default('90'),
  HEALTH_ALERT_MRR_DROP_PCT: z.string().transform((val) => parseFloat(val)).default('10'),
  HEALTH_ALERT_QUEUE_DEPTH: z.string().transform((val) => parseInt(val, 10)).default('1000'),
  HEALTH_ALERT_RESPONSE_TIME_MS: z.string().transform((val) => parseInt(val, 10)).default('1000'),
  HEALTH_COLLECTOR_INTERVAL_MIN: z.string().transform((val) => parseInt(val, 10)).default('5'),
  HEALTH_ALERT_CONSECUTIVE_CHECKS: z.string().transform((val) => parseInt(val, 10)).default('2'),

  // Alerting
  HEALTH_ALERT_TELEGRAM_BOT_TOKEN: z.string().optional(),
  HEALTH_ALERT_TELEGRAM_CHAT_ID: z.string().optional(),
  HEALTH_ALERT_EMAIL_TO: z.string().optional(),
  HEALTH_ALERT_SLACK_WEBHOOK: z.string().optional(),

  // Two-Factor Authentication
  // 64-character hex string (32 bytes) used to encrypt TOTP secrets
  TOTP_ENCRYPTION_KEY: z.string().min(64).max(64),

  // Database
  DATABASE_URL: z.string().optional(),

  // Database Connection Pooling (Vercel + Neon optimization)
  DATABASE_POOL_MIN: z.string().transform((val) => parseInt(val, 10)).default('2'),
  DATABASE_POOL_MAX: z.string().transform((val) => parseInt(val, 10)).default('10'),
  DATABASE_POOL_IDLE_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('30000'),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  DATABASE_POOL_CONNECT_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('10000'),
  DATABASE_STATEMENT_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).optional(),

  // Connection Retry & Circuit Breaker
  DATABASE_RETRY_ATTEMPTS: z.string().transform((val) => parseInt(val, 10)).default('3'),
  DATABASE_RETRY_DELAY_MS: z.string().transform((val) => parseInt(val, 10)).default('1000'),
  DATABASE_RETRY_MAX_DELAY_MS: z.string().transform((val) => parseInt(val, 10)).default('10000'),
  CIRCUIT_BREAKER_THRESHOLD: z.string().transform((val) => parseInt(val, 10)).default('5'),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('30000'),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

/**
 * Process and validate environment variables
 */
function getValidatedEnv() {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RATE_LIMIT_ADMIN_SECRET: process.env.RATE_LIMIT_ADMIN_SECRET,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_API_HOST: process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    ENABLE_ERROR_MONITORING: process.env.ENABLE_ERROR_MONITORING,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
    LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    BUFFER_API_KEY: process.env.BUFFER_API_KEY,
    POLAR_CLIENT_ID: process.env.POLAR_CLIENT_ID,
    POLAR_CLIENT_SECRET: process.env.POLAR_CLIENT_SECRET,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    // PayPal
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_SECRET: process.env.PAYPAL_WEBHOOK_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    // Resend
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    // Email DLQ Configuration
    EMAIL_DLQ_MAX_RETRIES: process.env.EMAIL_DLQ_MAX_RETRIES,
    EMAIL_DLQ_BACKOFF_SCHEDULE: process.env.EMAIL_DLQ_BACKOFF_SCHEDULE,
    EMAIL_DLQ_ALERT_THRESHOLD: process.env.EMAIL_DLQ_ALERT_THRESHOLD,
    EMAIL_DLQ_RETRY_INTERVAL: process.env.EMAIL_DLQ_RETRY_INTERVAL,
    // Alert Configuration
    ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    // GitHub
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    // PDF Invoice Configuration
    COMPANY_NAME: process.env.COMPANY_NAME,
    COMPANY_LOGO_URL: process.env.COMPANY_LOGO_URL,
    COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
    COMPANY_EMAIL: process.env.COMPANY_EMAIL,
    COMPANY_PHONE: process.env.COMPANY_PHONE,
    // Redis
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    // Webhook Security
    WEBHOOK_ENFORCE_IP_ALLOWLIST: process.env.WEBHOOK_ENFORCE_IP_ALLOWLIST,

    // Health Monitoring - Alert Thresholds
    HEALTH_ALERT_DB_LATENCY_MS: process.env.HEALTH_ALERT_DB_LATENCY_MS,
    HEALTH_ALERT_ERROR_RATE_PCT: process.env.HEALTH_ALERT_ERROR_RATE_PCT,
    HEALTH_ALERT_CPU_PCT: process.env.HEALTH_ALERT_CPU_PCT,
    HEALTH_ALERT_DISK_PCT: process.env.HEALTH_ALERT_DISK_PCT,
    HEALTH_ALERT_MRR_DROP_PCT: process.env.HEALTH_ALERT_MRR_DROP_PCT,
    HEALTH_ALERT_QUEUE_DEPTH: process.env.HEALTH_ALERT_QUEUE_DEPTH,
    HEALTH_ALERT_RESPONSE_TIME_MS: process.env.HEALTH_ALERT_RESPONSE_TIME_MS,
    HEALTH_COLLECTOR_INTERVAL_MIN: process.env.HEALTH_COLLECTOR_INTERVAL_MIN,
    HEALTH_ALERT_CONSECUTIVE_CHECKS: process.env.HEALTH_ALERT_CONSECUTIVE_CHECKS,
    // Alerting
    HEALTH_ALERT_TELEGRAM_BOT_TOKEN: process.env.HEALTH_ALERT_TELEGRAM_BOT_TOKEN,
    HEALTH_ALERT_TELEGRAM_CHAT_ID: process.env.HEALTH_ALERT_TELEGRAM_CHAT_ID,
    HEALTH_ALERT_EMAIL_TO: process.env.HEALTH_ALERT_EMAIL_TO,
    HEALTH_ALERT_SLACK_WEBHOOK: process.env.HEALTH_ALERT_SLACK_WEBHOOK,

    // Two-Factor Authentication
    TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY,
  };

  try {
    return envSchema.parse(rawEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((err) => err.code === 'invalid_type' && err.validator?.value === 'required')
        .map((err) => err.path.join('.'));

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(', ')}. ` +
          'Please check your .env.local file.'
        );
      }

      throw new Error(
        `Invalid environment configuration: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Load and validate environment on module initialization
 */
export const env = getValidatedEnv();

/**
 * Type-safe environment access
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if analytics is enabled
 */
export const isAnalyticsEnabled = (): boolean => {
  return env.ENABLE_ANALYTICS && !!env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
};

/**
 * Check if error monitoring is enabled
 */
export const isErrorMonitoringEnabled = (): boolean => {
  const clientEnabled = process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === 'true';
  const serverEnabled = env.ENABLE_ERROR_MONITORING;
  const dsnSet = !!(process.env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN);
  return (clientEnabled || serverEnabled) && dsnSet;
};