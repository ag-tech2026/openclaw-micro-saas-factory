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
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),

  // Database
  DATABASE_URL: z.string().optional(),
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
    DATABASE_URL: process.env.DATABASE_URL,
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