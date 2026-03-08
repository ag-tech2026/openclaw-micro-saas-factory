/**
 * Configuration loader and validator
 */
export interface BotConfig {
  // Twitter credentials
  twitter: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
    bearerToken: string;
    clientId?: string;
    clientSecret?: string;
  };

  // Redis/Persistence
  redisUrl?: string;

  // Bot behavior
  enabled: boolean;
  dryRun: boolean;
  checkIntervalMinutes: number;
  maxTweetsPerDay: number;
  maxFollowsPerDay: number;
  maxRetweetsPerDay: number;
  maxLikesPerDay: number;

  // Targeting
  targetKeywords: string[];

  // Announcements
  announcementTemplate: string;

  // Logging
  logLevel: string;
}

function getEnvVar(name: string, required: boolean = true): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntEnv(name: string, defaultValue: number, required: boolean = false): number {
  const value = getEnvVar(name, required);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${value}`);
  }
  return parsed;
}

function parseBoolEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function loadConfig(): BotConfig {
  const config: BotConfig = {
    twitter: {
      apiKey: getEnvVar('TWITTER_API_KEY')!,
      apiSecret: getEnvVar('TWITTER_API_SECRET')!,
      accessToken: getEnvVar('TWITTER_ACCESS_TOKEN')!,
      accessSecret: getEnvVar('TWITTER_ACCESS_SECRET')!,
      bearerToken: getEnvVar('TWITTER_BEARER_TOKEN')!,
      clientId: getEnvVar('TWITTER_CLIENT_ID', false),
      clientSecret: getEnvVar('TWITTER_CLIENT_SECRET', false),
    },
    redisUrl: getEnvVar('REDIS_URL', false),
    enabled: parseBoolEnv('BOT_ENABLED', true),
    dryRun: parseBoolEnv('DRY_RUN', false),
    checkIntervalMinutes: parseIntEnv('CHECK_INTERVAL_MINUTES', 15),
    maxTweetsPerDay: parseIntEnv('MAX_TWEETS_PER_DAY', 50),
    maxFollowsPerDay: parseIntEnv('MAX_FOLLOWS_PER_DAY', 100),
    maxRetweetsPerDay: parseIntEnv('MAX_RETWEETS_PER_DAY', 100),
    maxLikesPerDay: parseIntEnv('MAX_LIKES_PER_DAY', 200),
    targetKeywords: getEnvVar('TARGET_KEYWORDS', false)
      ? getEnvVar('TARGET_KEYWORDS')!.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : ['AI vision', 'computer vision', 'artificial intelligence', 'SaaS', 'startup', 'MVP', 'product launch', 'tech startup'],
    announcementTemplate: getEnvVar('ANNOUNCEMENT_TEMPLATE', false) || '🚀 Excited to announce that {product_name} is now live! {description} Check it out: {link} #AI #SaaS #MVP',
    logLevel: getEnvVar('LOG_LEVEL', false) || 'info',
  };

  return config;
}