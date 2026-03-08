import { TwitterClient } from './twitter';
import { QueueManager } from './queue';
import { logger } from './logger';
import { BotConfig } from './types';

export class MvpAnnouncer {
  private twitter: TwitterClient;
  private queue: QueueManager;
  private config: BotConfig;

  constructor(twitter: TwitterClient, queue: QueueManager, config: BotConfig) {
    this.twitter = twitter;
    this.queue = queue;
    this.config = config;
  }

  async runPostingCycle(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Bot is disabled, skipping posting cycle');
      return;
    }

    logger.info('Starting posting cycle');

    try {
      const nextPost = this.queue.getNextPost();

      if (!nextPost) {
        logger.info('No posts scheduled, waiting for next interval');
        return;
      }

      const content = this.formatPostContent(nextPost);
      logger.info(`Posting: ${content.substring(0, 50)}...`);

      if (this.config.dryRun) {
        logger.info(`[DRY RUN] Would post tweet with content: ${content}`);
        // Simulate success
        this.queue.markAsPosted(nextPost.id, 'dry-run-tweet-id');
        return;
      }

      const result = await this.twitter.postTweet(content);

      if (result.success && result.data) {
        logger.info(`Successfully posted tweet ${result.data.id}`);
        this.queue.markAsPosted(nextPost.id, result.data.id);
      } else {
        logger.warn(`Failed to post tweet: ${result.error}`);
      }
    } catch (error) {
      logger.error('Posting cycle failed:', error);
    }
  }

  private formatPostContent(post: any): string {
    let content = post.content;

    // Add hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagString = post.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ');
      content += `\n\n${hashtagString}`;
    }

    // Add link if present
    if (post.link) {
      content += `\n\n${post.link}`;
    }

    // Ensure we don't exceed Twitter's character limit (280)
    if (content.length > 280) {
      content = content.substring(0, 277) + '...';
    }

    return content;
  }

  async scheduleMvpAnnouncements(announcements: Array<{
    content: string;
    hashtags: string[];
    link?: string;
    delayMinutes?: number;
  }>): Promise<void> {
    let delay = 0;

    for (const announcement of announcements) {
      const scheduledAt = new Date(Date.now() + delay * 60 * 1000);
      const postDelay = announcement.delayMinutes || 5;

      this.queue.addPost(
        announcement.content,
        announcement.hashtags,
        announcement.link,
        new Date(Date.now() + (delay * 60 * 1000))
      );

      delay += postDelay;
      logger.info(`Scheduled MVP announcement for ${scheduledAt.toISOString()}`);
    }

    this.queue.saveQueueToFile();
  }

  getQueueStats() {
    return this.queue.getStats();
  }
}
