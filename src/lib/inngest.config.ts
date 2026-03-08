import { defineConfig } from 'inngest';

/**
 * Inngest configuration for async vision analysis jobs
 */
export const inngestConfig = defineConfig({
  name: 'vision-analysis',
  // Inngest will automatically detect your deployed URL
  // You can override it here if needed:
  // url: process.env.INNGEST_URL || 'https://your-app.vercel.app/api/inngest',
});
