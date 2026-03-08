#!/usr/bin/env node
/**
 * Initialize subscription analytics database
 * Run: npx ts-node src/lib/subscription-schema.ts
 * Or: node dist/subscription-schema.js after building
 */

import { initializeDatabase } from '@/lib/subscription-schema';

async function main() {
  try {
    await initializeDatabase();
    console.log('✅ Subscription analytics database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

main();
