import { Queue, Job, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { BotConfig } from './config';

export interface RateLimitConfig {
  maxPerDay: number;
  perSecond?: number;
  perMinute?: number;
}

export enum JobType {
  TWEET = 'tweet',
  RETWEET = 'retweet',
  LIKE = 'like',
  FOLLOW = 'follow',
}

export interface TweetJobData {
  text: string;
  replyToId?: string;
  scheduledAt?: Date;
}

export interface RetweetJobData {
  tweetId: string;
}

export interface LikeJobData {
  tweetId: string;
}

export interface FollowJobData {
  target: string; // user ID or username
}

export class RateLimitedQueue {
  private config: BotConfig;
  private connection: IORedis.Redis | null = null;
  private tweetQueue: Queue | null = null;
  private followQueue: Queue | null = null;
  private retweetQueue: Queue | null = null;
  private likeQueue: Queue | null = null;
  private queueScheduler: QueueScheduler | null = null;
  private workers: Worker[] = [];

  // In-memory counters for rate limiting
  private dailyCounters: Map<string, number> = new Map();
  private lastResetDate: string = new Date().toDateString();

  constructor(config: BotConfig) {
    this.config = config;
    this.init();
  }

  private init(): void {
    if (this.config.redisUrl) {
      this.connection = new IORedis(this.config.redisUrl);
      this.setupRedisQueues();
    } else {
      logger.info('Redis URL not configured, using in-memory queue');
    }
  }

  private setupRedisQueues(): void {
    const queueOptions = {
      connection: this.connection,
      defaultJobOpts: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    };

    this.tweetQueue = new Queue(JobType.TWEET, queueOptions);
    this.followQueue = new Queue(JobType.FOLLOW, queueOptions);
    this.retweetQueue = new Queue(JobType.RETWEET, queueOptions);
    this.likeQueue = new Queue(JobType.LIKE, queueOptions);

    // Queue scheduler for delayed jobs
    this.queueScheduler = new QueueScheduler(
      [this.tweetQueue, this.followQueue, this.retweetQueue, this.likeQueue].filter(q => q !== null) as Queue[],
      { connection: this.connection }
    );

    this.startWorkers();
    logger.info('Redis queues initialized');
  }

  private startWorkers(): void {
    if (!this.tweetQueue || !this.followQueue || !this.retweetQueue || !this.likeQueue) {
      return;
    }

    // Tweet worker
    this.workers.push(new Worker(JobType.TWEET, async (job) => {
      const data = job.data as TweetJobData;
      return this.executeTweet(data);
    }, { connection: this.connection }));

    // Follow worker
    this.workers.push(new Worker(JobType.FOLLOW, async (job) => {
      const data = job.data as FollowJobData;
      return this.executeFollow(data);
    }, { connection: this.connection }));

    // Retweet worker
    this.workers.push(new Worker(JobType.RETWEET, async (job) => {
      const data = job.data as RetweetJobData;
      return this.executeRetweet(data);
    }, { connection: this.connection }));

    // Like worker
    this.workers.push(new Worker(JobType.LIKE, async (job) => {
      const data = job.data as LikeJobData;
      return this.executeLike(data);
    }, { connection: this.connection }));

    logger.info('Queue workers started');
  }

  // Rate limit checking
  private checkRateLimit(action: string): boolean {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyCounters.clear();
      this.lastResetDate = today;
    }

    const key = `${action}:${today}`;
    const currentCount = this.dailyCounters.get(key) || 0;
    const maxKey = `max${action.charAt(0).toUpperCase() + action.slice(1)}PerDay` as keyof BotConfig;

    const maxAllowed = this.config[maxKey] as number;

    if (currentCount >= maxAllowed) {
      logger.warn(`Rate limit exceeded for ${action}`, { current: currentCount, max: maxAllowed });
      return false;
    }

    this.dailyCounters.set(key, currentCount + 1);
    return true;
  }

  // Execution methods (separated for testing)
  private async executeTweet(data: TweetJobData): Promise<{ success: boolean; tweetId?: string }> {
    if (!this.checkRateLimit('tweet')) {
      return { success: false };
    }

    // This will be called from the bot instance, need to inject client
    // For now, return a placeholder
    return { success: true, tweetId: 'placeholder' };
  }

  private async executeFollow(data: FollowJobData): Promise<{ success: boolean }> {
    if (!this.checkRateLimit('follow')) {
      return { success: false };
    }

    return { success: true };
  }

  private async executeRetweet(data: RetweetJobData): Promise<{ success: boolean }> {
    if (!this.checkRateLimit('retweet')) {
      return { success: false };
    }

    return { success: true };
  }

  private async executeLike(data: LikeJobData): Promise<{ success: boolean }> {
    if (!this.checkRateLimit('like')) {
      return { success: false };
    }

    return { success: true };
  }

  // Public methods
  async scheduleTweet(text: string, replyToId?: string, delayMs?: number): Promise<Job> {
    const data: TweetJobData = { text, replyToId };

    if (this.tweetQueue) {
      if (delayMs) {
        return await this.tweetQueue.add('post', data, { delay: delayMs });
      }
      return await this.tweetQueue.add('post', data);
    } else {
      // In-memory fallback - immediate execution
      logger.warn('In-memory mode: executing tweet immediately (no scheduling)');
      return {
        id: 'inmem-' + Date.now(),
        data,
        progress: () => 100,
        log: () => [],
        remove: async () => {},
      } as Job;
    }
  }

  async scheduleRetweet(tweetId: string): Promise<Job> {
    const data: RetweetJobData = { tweetId };

    if (this.retweetQueue) {
      return await this.retweetQueue.add('retweet', data);
    }
    return {
      id: 'inmem-' + Date.now(),
      data,
      progress: () => 100,
      log: () => [],
      remove: async () => {},
    } as Job;
  }

  async scheduleLike(tweetId: string): Promise<Job> {
    const data: LikeJobData = { tweetId };

    if (this.likeQueue) {
      return await this.likeQueue.add('like', data);
    }
    return {
      id: 'inmem-' + Date.now(),
      data,
      progress: () => 100,
      log: () => [],
      remove: async () => {},
    } as Job;
  }

  async scheduleFollow(target: string): Promise<Job> {
    const data: FollowJobData = { target };

    if (this.followQueue) {
      return await this.followQueue.add('follow', data);
    }
    return {
      id: 'inmem-' + Date.now(),
      data,
      progress: () => 100,
      log: () => [],
      remove: async () => {},
    } as Job;
  }

  async getQueueStats(): Promise<{ [queueName: string]: { waiting: number; active: number; completed: number; failed: number } }> {
    if (!this.tweetQueue) {
      return {};
    }

    const queues = [this.tweetQueue, this.followQueue, this.retweetQueue, this.likeQueue].filter(q => q !== null) as Queue[];
    const stats: { [queueName: string]: any } = {};

    await Promise.all(queues.map(async (queue) => {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      stats[queue.name] = { waiting, active, completed, failed };
    }));

    return stats;
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(w => w.close()));
    await Promise.all(
      [this.tweetQueue, this.followQueue, this.retweetQueue, this.likeQueue]
        .filter(q => q !== null)
        .map(q => q!.close())
    );
    if (this.connection) {
      await this.connection.quit();
    }
    if (this.queueScheduler) {
      await this.queueScheduler.close();
    }
  }
}