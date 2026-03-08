import { TwitterApi, TweetV2, TwitterApiError } from 'twitter-api-v2';
import { TwitterConfig, Tweet, User, RateLimitInfo, ProcessResult } from './types';

export class TwitterClient {
  private client: TwitterApi;
  private readonly userId: string;

  constructor(config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });
    this.userId = config.userId;
  }

  async getRateLimitInfo(): Promise<RateLimitInfo | null> {
    try {
      const response = await this.client.v2.get('application/rate_limit_status');
      const { resources } = response.data as any;

      if (resources?.search?.['/search/tweets']) {
        const searchLimit = resources['/search/tweets'];
        return {
          remaining: searchLimit.remaining,
          reset: Math.floor(Date.now() / 1000) + searchLimit.reset,
          limit: searchLimit.limit,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
      return null;
    }
  }

  async postTweet(content: string, replyToId?: string): Promise<ProcessResult<Tweet>> {
    try {
      if (this.isRateLimited('tweet')) {
        return {
          success: false,
          error: 'Rate limit exceeded for tweeting',
        };
      }

      const tweet: TweetV2.Tweet = await this.client.v2.tweet(content, {
        in_reply_to_tweet_id: replyToId,
      });

      return {
        success: true,
        data: {
          id: tweet.data.id,
          text: tweet.data.text,
          author_id: tweet.data.author_id,
          created_at: tweet.data.created_at,
        },
      };
    } catch (error: any) {
      console.error('Failed to post tweet:', error);
      return {
        success: false,
        error: error.message || 'Unknown error posting tweet',
      };
    }
  }

  async retweet(tweetId: string): Promise<ProcessResult<void>> {
    try {
      if (this.isRateLimited('retweet')) {
        return {
          success: false,
          error: 'Rate limit exceeded for retweeting',
        };
      }

      await this.client.v2.retweet(this.userId, tweetId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to retweet:', error);
      return {
        success: false,
        error: error.message || 'Unknown error retweeting',
      };
    }
  }

  async likeTweet(tweetId: string): Promise<ProcessResult<void>> {
    try {
      if (this.isRateLimited('like')) {
        return {
          success: false,
          error: 'Rate limit exceeded for liking',
        };
      }

      await this.client.v2.like(this.userId, tweetId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to like tweet:', error);
      return {
        success: false,
        error: error.message || 'Unknown error liking tweet',
      };
    }
  }

  async followUser(userId: string): Promise<ProcessResult<void>> {
    try {
      if (this.isRateLimited('follow')) {
        return {
          success: false,
          error: 'Rate limit exceeded for following',
        };
      }

      await this.client.v2.follow(this.userId, userId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to follow user:', error);
      return {
        success: false,
        error: error.message || 'Unknown error following user',
      };
    }
  }

  async searchTweets(
    query: string,
    maxResults: number = 10,
    options: { recent?: boolean; startTime?: string } = {}
  ): Promise<ProcessResult<Tweet[]>> {
    try {
      const tweets: Tweet[] = [];
      const expansions = ['author_id'];
      const tweetFields = ['created_at', 'public_metrics'];

      const response = await this.client.v2.search(
        query,
        {
          max_results: maxResults,
          expansions,
          'tweet.fields': tweetFields,
          ...options,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(tweet => {
          tweets.push({
            id: tweet.id,
            text: tweet.text,
            author_id: tweet.author_id,
            created_at: tweet.created_at,
            public_metrics: tweet.public_metrics,
          });
        });
      }

      return { success: true, data: tweets };
    } catch (error: any) {
      console.error('Failed to search tweets:', error);
      return {
        success: false,
        error: error.message || 'Unknown error searching tweets',
      };
    }
  }

  async getUser(username: string): Promise<ProcessResult<User | null>> {
    try {
      const response = await this.client.v2.userByUsername(username, {
        'user.fields': ['description', 'public_metrics'],
      });

      if (response.data) {
        return {
          success: true,
          data: {
            id: response.data.id,
            username: response.data.username,
            name: response.data.name,
            description: response.data.description,
            public_metrics: response.data.public_metrics,
          },
        };
      }

      return { success: true, data: null };
    } catch (error: any) {
      console.error('Failed to get user:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting user',
      };
    }
  }

  async getUserById(userId: string): Promise<ProcessResult<User | null>> {
    try {
      const response = await this.client.v2.user(userId, {
        'user.fields': ['description', 'public_metrics'],
      });

      if (response.data) {
        return {
          success: true,
          data: {
            id: response.data.id,
            username: response.data.username,
            name: response.data.name,
            description: response.data.description,
            public_metrics: response.data.public_metrics,
          },
        };
      }

      return { success: true, data: null };
    } catch (error: any) {
      console.error('Failed to get user by ID:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting user',
      };
    }
  }

  async getUserFollowing(userId: string, maxResults: number = 5): Promise<ProcessResult<string[]>> {
    try {
      const following: string[] = [];

      const response = await this.client.v2.usersIdFollowing(userId, {
        max_results: maxResults,
      });

      if (response.data) {
        response.data.forEach(user => following.push(user.id));
      }

      return { success: true, data: following };
    } catch (error: any) {
      console.error('Failed to get user following:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting user following',
      };
    }
  }

  private isRateLimited(action: string): boolean {
    // Basic rate limit check - can be enhanced with Redis-based tracking
    return false;
  }
}
