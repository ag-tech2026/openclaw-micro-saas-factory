export interface TwitterConfig {
  bearerToken: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  userId: string;
}

export interface QueueConfig {
  type: 'memory' | 'redis';
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}

export interface BotConfig {
  enabled: boolean;
  dryRun: boolean;
  postIntervalMinutes: number;
  maxDailyEngagements: number;
  maxDailyFollows: number;
  engagementKeywords: string[];
  excludePhrases: string[];
  targetLocations?: string[];
  queueFilePath: string;
  logLevel: string;
  logFile: string;
}

export interface PostItem {
  id: string;
  content: string;
  hashtags: string[];
  link?: string;
  scheduledAt: Date;
  posted: boolean;
  postedAt?: Date;
  tweetId?: string;
}

export interface EngagementAction {
  id: string;
  type: 'retweet' | 'like' | 'follow' | 'reply';
  tweetId: string;
  tweetText: string;
  authorId: string;
  authorUsername: string;
  keywordMatched: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  reason?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface QueueStats {
  totalPosts: number;
  pendingPosts: number;
  completedToday: number;
  engagementsUsedToday: number;
  followsUsedToday: number;
}

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export interface User {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

export type ProcessResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  rateLimit?: RateLimitInfo;
};
