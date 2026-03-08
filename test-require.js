try {
  const drizzle = require('drizzle-orm');
  console.log('drizzle-orm loaded:', drizzle);
} catch (e) {
  console.error('Failed to require drizzle-orm:', e.message);
}
