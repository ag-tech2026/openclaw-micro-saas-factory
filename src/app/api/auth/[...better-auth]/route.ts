import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Export GET and POST handlers for the catch-all route
// This handles:
// - POST /api/auth/sign-up
// - POST /api/auth/sign-in
// - POST /api/auth/sign-out
// - GET /api/auth/session
// - POST /api/auth/reset-password
// - OAuth callbacks
export const { GET, POST } = toNextJsHandler(auth);
