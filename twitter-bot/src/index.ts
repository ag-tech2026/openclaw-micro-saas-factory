import { loadTwitterConfig, loadBotConfig, loadQueueConfig } from './config';
import { setupLogger } from './logger';
import { TwitterClient } from './twitter';
import { QueueManager } from './queue';
import { EngagementEngine } from './engagement';
import { MvpAnnouncer } from './mvp-announcer';
import * as path from 'path';

async function main() {
  console.log('🚀 Twitter Audience-Building Bot Starting...');

  try {
    // Load configuration
    const twitterConfig = loadTwitterConfig();
    const botConfig = loadBotConfig();
    const queueConfig = loadQueueConfig();

    // Set up logging
    setupLogger(botConfig);

    console.log('✅ Configuration loaded');
    console.log(`   Mode: ${botConfig.dryRun ? 'DRY RUN' : 'ACTIVE'}`);
    console.log(`   Post interval: ${botConfig.postIntervalMinutes} minutes`);
    console.log(`   Daily limits - Engagements: ${botConfig.maxDailyEngagements}, Follows: ${botConfig.maxDailyFollows}`);

    // Initialize components
    const twitter = new TwitterClient(twitterConfig);
    const queue = new QueueManager(path.resolve(botConfig.queueFilePath));
    const engagementEngine = new EngagementEngine(twitter, queue, botConfig);
    const mvpAnnouncer = new MvpAnnouncer(twitter, queue, botConfig);

    console.log('✅ Components initialized');

    // Schedule default MVP announcements if queue is empty
    if (queue.getPendingPosts().length === 0) {
      console.log('📋 Scheduling default MVP announcements...');

      const defaultAnnouncements = [
        {
          content: "🎉 We're excited to announce our MVP is now live!",
          hashtags: ['MVP', 'Launch', 'SaaS'],
          delayMinutes: 5,
        },
        {
          content: "Building the future of AI-powered SaaS. Thanks to our amazing beta testers! 🚀",
          hashtags: ['AI', 'SaaS', 'Tech'],
          link: 'https://your-product.com',
          delayMinutes: 15,
        },
        {
          content: "Democratizing AI vision technology for everyone. Try our demo today!",
          hashtags: ['AIVision', 'MachineLearning', 'Startup'],
          link: 'https://your-product.com/demo',
          delayMinutes: 30,
        },
      ];

      await mvpAnnouncer.scheduleMvpAnnouncements(defaultAnnouncements);
    }

    // Main bot loop
    console.log('🤖 Starting main bot loop...\n');

    let postCycleCount = 0;
    let engagementCycleCount = 0;
    const POST_INTERVAL_MS = botConfig.postIntervalMinutes * 60 * 1000;
    const ENGAGEMENT_INTERVAL_MS = 15 * 60 * 1000; // Every 15 minutes

    while (true) {
      const now = new Date();

      // Run posting cycle if it's time
      const lastPostCycle = postCycleCount * POST_INTERVAL_MS;
      if (now.getTime() % POST_INTERVAL_MS < 60000) { // Within the first minute of the interval
        await mvpAnnouncer.runPostingCycle();
        postCycleCount++;
      }

      // Run engagement cycle if it's time (every 15 minutes)
      if (now.getTime() % ENGAGEMENT_INTERVAL_MS < 60000) {
        await engagementEngine.runEngagementCycle();
        engagementCycleCount++;
      }

      // Log stats every 5 minutes
      if (engagementCycleCount % 3 === 0) {
        const stats = queue.getStats();
        console.log(`📊 Stats - Pending posts: ${stats.pendingPosts}, Engagements today: ${stats.engagementsUsedToday}, Follows today: ${stats.followsUsedToday}`);
      }

      // Wait before next check (30 second intervals)
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch(console.error);
