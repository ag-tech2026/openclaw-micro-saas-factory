import { TwitterApi, UserV2, TweetV2, TwitterApiError } from 'twitter-api-v2';
import { BotConfig } from './config';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export class TwitterClient {
  private client: TwitterApi;
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;

    // Use app-only (bearer token) for read operations
    // Use OAuth 1.0a user context for write operations
    if (config.twitter.clientId && config.twitter.clientSecret) {
      // OAuth 2.0 with PKCE or user context
      this.client = new TwitterApi({
        appKey: config.twitter.apiKey,
        appSecret: config.twitter.apiSecret,
        clientId: config.twitter.clientId,
        clientSecret: config.twitter.clientSecret,
        accessToken: config.twitter.accessToken,
        accessSecret: config.twitter.accessSecret,
      });
    } else {
      // Fallback to OAuth 1.0a with bearer token for read-only
      this.client = new TwitterApi({
        appKey: config.twitter.apiKey,
        appSecret: config.twitter.apiSecret,
        accessToken: config.twitter.accessToken,
        accessSecret: config.twitter.accessSecret,
      });
    }

    logger.info('Twitter client initialized');
  }

  /**
   * Search for tweets based on keywords
   */
  async searchTweets(query: string, maxResults: number = 10): Promise<TweetV2[]> {
    try {
      const tweets = await this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'context_annotations'],
        expansions: ['author_id'],
        'user.fields': ['username', 'name', 'verified'],
      });

      return tweets.data?.data || [];
    } catch (error: any) {
      logger.error('Failed to search tweets', { error: error.message, query });
      return [];
    }
  }

  /**
   * Post a new tweet
   */
  async postTweet(text: string, replyToId?: string): Promise<string | null> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Posting tweet: ${text}`);
      return 'dry-run-tweet-id';
    }

    try {
      const tweet = await this.client.v2.tweet(text, {
        reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined,
      });

      logger.info('Tweet posted successfully', { tweetId: tweet.data.id, text: text.substring(0, 50) });
      return tweet.data.id;
    } catch (error: any) {
      logger.error('Failed to post tweet', { error: error.message, text });
      return null;
    }
  }

  /**
   * Retweet a tweet by ID
   */
  async retweet(tweetId: string): Promise<boolean> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Retweeting tweet: ${tweetId}`);
      return true;
    }

    try {
      await this.client.v2.retweet(tweetId);
      logger.info('Retweeted successfully', { tweetId });
      return true;
    } catch (error: any) {
      logger.error('Failed to retweet', { error: error.message, tweetId });
      return false;
    }
  }

  /**
   * Like a tweet
   */
  async like(tweetId: string): Promise<boolean> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Liking tweet: ${tweetId}`);
      return true;
    }

    try {
      await this.client.v2.like(tweetId);
      logger.info('Liked tweet', { tweetId });
      return true;
    } catch (error: any) {
      logger.error('Failed to like tweet', { error: error.message, tweetId });
      return false;
    }
  }

  /**
   * Follow a user by user ID or username
   */
  async follow(target: string): Promise<boolean> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Following user: ${target}`);
      return true;
    }

    try {
      // Check if already following
      const me = await this.client.v2.me();
      const following = await this.client.v2.following(me.data.id, {
        max_results: 1000,
      });
      const alreadyFollowing = following.data.some((f: any) =>
        f.username.toLowerCase() === target.toLowerCase() ||
        f.id === target
      );

      if (alreadyFollowing) {
        logger.info('Already following user', { target });
        return true;
      }

      await this.client.v2.follow(target);
      logger.info('Followed user', { target });
      return true;
    } catch (error: any) {
      logger.error('Failed to follow user', { error: error.message, target });
      return false;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserV2 | null> {
    try {
      const user = await this.client.v2.userByUsername(username);
      return user.data;
    } catch (error: any) {
      logger.error('Failed to get user', { error: error.message, username });
      return null;
    }
  }

  /**
   * Get user's followers (for analysis)
   */
  async getFollowers(userId: string, maxResults: number = 1000): Promise<UserV2[]> {
    try {
      const followers = await this.client.v2.followers(userId, {
        max_results: Math.min(maxResults, 1000),
        'user.fields': ['username', 'name', 'description', 'verified', 'public_metrics'],
      });
      return followers.data.data || [];
    } catch (error: any) {
      logger.error('Failed to get followers', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Get user's recent tweets
   */
  async getUserTweets(userId: string, maxResults: number = 10): Promise<TweetV2[]> {
    try {
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        exclude: ['retweets', 'replies'],
        'tweet.fields': ['created_at', 'public_metrics'],
      });
      return tweets.data.data || [];
    } catch (error: any) {
      logger.error('Failed to get user tweets', { error: error.message, userId });
      return [];
    }
  }
}