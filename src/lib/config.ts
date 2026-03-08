import { z } from 'zod';

/**
 * Environment variables schema validation
 * All required env vars are defined here with proper types
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Analytics
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_API_HOST: z.string().url().default('https://plausible.io'),
  ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('true'),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  ENABLE_ERROR_MONITORING: z.string().transform((val) => val === 'true').default('true'),

  // AI APIs
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Polar
  POLAR_CLIENT_ID: z.string().optional(),
  POLAR_CLIENT_SECRET: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Process and validate environment variables
 */
function getValidatedEnv() {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
    POLAR_CLIENT_ID: process.env.POLAR_CLIENT_ID,
    POLAR_CLIENT_SECRET: process.env.POLAR_CLIENT_SECRET,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
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
  return env.ENABLE_ERROR_MONITORING && !!env.SENTRY_DSN;
};