import { Inngest } from 'inngest';
import { inngestConfig } from './config';

/**
 * Create Inngest client instance
 * Used for enqueuing jobs from API routes
 */
export const inngest = new Inngest({
  ...inngestConfig,
  // Event deduplication window (default: 2 minutes)
  deduplication: '2m',
  // Retry policy for failed events
  retries: {
    limit: 3,
    minInterval: 1000, // 1 second
    maxInterval: 60000, // 1 minute
    backoff: 'exponential',
  },
});

// Event types
export const EVENTS = {
  // Triggered when a new image needs analysis
  VISION_ANALYSIS_REQUESTED: 'vision/analysis.requested',
  // Analysis completed successfully
  VISION_ANALYSIS_COMPLETED: 'vision/analysis.completed',
  // Analysis failed
  VISION_ANALYSIS_FAILED: 'vision/analysis.failed',
} as const;
