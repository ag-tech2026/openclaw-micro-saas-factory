import { TwitterClient } from './twitter';
import { QueueManager } from './queue';
import { logger } from './logger';
import { BotConfig, EngagementAction } from './types';

export class EngagementEngine {
  private twitter: TwitterClient;
  private queue: QueueManager;
  private config: BotConfig;

  // Track followed users to avoid re-following
  private followedUsers: Set<string> = new Set();
  // Track processed tweets to avoid re-engaging
  private processedTweets: Set<string> = new Set();

  constructor(twitter: TwitterClient, queue: QueueManager, config: BotConfig) {
    this.twitter = twitter;
    this.queue = queue;
    this.config = config;
    this.loadState();
  }

  async runEngagementCycle(): Promise<void> {
    if (this.isDailyLimitReached()) {
      logger.info('Daily engagement limits reached, skipping cycle');
      return;
    }

    logger.info('Starting engagement cycle');

    try {
      // Search for tweets with target keywords
      await this.searchAndEngage();

      // Follow users from relevant tweets
      await this.followRelevantUsers();

      this.saveState();
      logger.info('Engagement cycle completed');
    } catch (error) {
      logger.error('Engagement cycle failed:', error);
    }
  }

  private async searchAndEngage(): Promise<void> {
    const keywords = this.config.engagementKeywords;

    for (const keyword of keywords) {
      try {
        logger.info(`Searching for tweets with keyword: ${keyword}`);

        const result = await this.twitter.searchTweets(keyword, 10, {
          recent: true,
        });

        if (!result.success || !result.data) {
          logger.warn(`Failed to search for keyword "${keyword}": ${result.error}`);
          continue;
        }

        for (const tweet of result.data) {
          await this.processTweet(tweet, keyword);
        }

        // Rate limit: pause between searches
        await this.delay(2000);
      } catch (error) {
        logger.error(`Error processing keyword "${keyword}":`, error);
      }
    }
  }

  private async processTweet(tweet: any, keyword: string): Promise<void> {
    if (this.processedTweets.has(tweet.id)) {
      return;
    }

    const tweetText = tweet.text.toLowerCase();

    // Skip if it's our own tweet
    if (tweet.author_id === this.config.dryRun ? 'test' : 'our_user_id') {
      return;
    }

    // Skip if contains excluded phrases
    if (this.containsExcludedPhrase(tweetText)) {
      logger.debug(`Skipping tweet ${tweet.id}: contains excluded phrase`);
      this.processedTweets.add(tweet.id);
      return;
    }

    // Prioritize: retweet, like, reply (if it's a conversation starter)
    const actions: Array<{ type: EngagementAction['type']; chance: number }> = [
      { type: 'retweet', chance: 0.7 },
      { type: 'like', chance: 0.9 },
    ];

    for (const action of actions) {
      if (Math.random() < action.chance) {
        const engagementId = this.queue.enqueueEngagement(
          action.type,
          tweet.id,
          tweet.text,
          tweet.author_id,
          tweet.author_id, // We'll fetch username if needed
          keyword
        );

        await this.executeEngagement(engagementId, action.type, tweet);
      }
    }

    this.processedTweets.add(tweet.id);
  }

  private async executeEngagement(engagementId: string, type: EngagementAction['type'], tweet: any): Promise<boolean> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Would ${type} tweet ${tweet.id}`);
      this.queue.updateEngagementStatus(engagementId, 'skipped', 'Dry run mode');
      return true;
    }

    try {
      let result;

      switch (type) {
        case 'retweet':
          result = await this.twitter.retweet(tweet.id);
          break;
        case 'like':
          result = await this.twitter.likeTweet(tweet.id);
          break;
        default:
          return false;
      }

      if (result.success) {
        logger.info(`Successfully ${type}d tweet ${tweet.id}`);
        this.queue.updateEngagementStatus(engagementId, 'completed');
        return true;
      } else {
        logger.warn(`Failed to ${type} tweet ${tweet.id}: ${result.error}`);
        this.queue.updateEngagementStatus(engagementId, 'failed', result.error);
        return false;
      }
    } catch (error) {
      logger.error(`Error ${type}ing tweet ${tweet.id}:`, error);
      this.queue.updateEngagementStatus(engagementId, 'failed', String(error));
      return false;
    }
  }

  private async followRelevantUsers(): Promise<void> {
    const stats = this.queue.getStats();

    if (stats.followsUsedToday >= this.config.maxDailyFollows) {
      logger.info('Daily follow limit reached, skipping user follows');
      return;
    }

    // Get some recent engaged tweets and follow their authors
    const recentEngagements = this.queue.getEngagementsToProcess(20);

    for (const engagement of recentEngagements) {
      if (engagement.authorId && !this.followedUsers.has(engagement.authorId)) {
        if (this.config.dryRun) {
          logger.info(`[DRY RUN] Would follow user ${engagement.authorUsername} (${engagement.authorId})`);
          continue;
        }

        try {
          const result = await this.twitter.followUser(engagement.authorId);
          if (result.success) {
            logger.info(`Started following user ${engagement.authorUsername}`);
            this.followedUsers.add(engagement.authorId);
            await this.delay(1000); // Rate limit spacing
          }
        } catch (error) {
          logger.error(`Failed to follow user ${engagement.authorUsername}:`, error);
        }
      }
    }
  }

  private containsExcludedPhrase(text: string): boolean {
    return this.config.excludePhrases.some(phrase =>
      text.includes(phrase.toLowerCase())
    );
  }

  private isDailyLimitReached(): boolean {
    const stats = this.queue.getStats();

    const engagementsLimitReached =
      stats.engagementsUsedToday >= this.config.maxDailyEngagements;
    const followsLimitReached =
      stats.followsUsedToday >= this.config.maxDailyFollows;

    return engagementsLimitReached && followsLimitReached;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getStatePath(): string {
    return './data/engagement-state.json';
  }

  private saveState(): void {
    try {
      const state = {
        followedUsers: Array.from(this.followedUsers),
        processedTweets: Array.from(this.processedTweets),
        updatedAt: new Date().toISOString(),
      };

      const statePath = this.getStatePath();
      const dir = path.dirname(statePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.error('Failed to save engagement state:', error);
    }
  }

  private loadState(): void {
    try {
      const statePath = this.getStatePath();
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, 'utf-8');
        const state = JSON.parse(content);

        this.followedUsers = new Set(state.followedUsers || []);
        this.processedTweets = new Set(state.processedTweets || []);

        // Clean up old processed tweets (older than 7 days)
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentTweets = Array.from(this.processedTweets).filter(id => {
          // We don't have timestamps, so we'll keep all for now
          // Could be enhanced with a Map<id, timestamp>
          return true;
        });
        this.processedTweets = new Set(recentTweets);

        logger.info(`Loaded engagement state: ${this.followedUsers.size} followed users, ${this.processedTweets.size} processed tweets`);
      }
    } catch (error) {
      logger.error('Failed to load engagement state:', error);
    }
  }
}
