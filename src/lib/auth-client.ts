import { createAuthClient } from 'better-auth/client';

/**
 * Client-side authentication client
 * Uses cookie-based sessions for better security
 */
export const authClient = createAuthClient({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'http://localhost:3000',
  token: 'cookie',
});

// Re-export authClient methods for convenience
export const { signIn, signOut, getSession } = authClient;
