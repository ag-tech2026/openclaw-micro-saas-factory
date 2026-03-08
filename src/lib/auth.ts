import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@/db';
import { users, sessions, accounts, verificationRequests } from '@/db/schema';

/**
 * BetterAuth configuration with Drizzle adapter for Neon DB
 *
 * Features:
 * - Email & password authentication
 * - OAuth support (Google, etc.)
 * - Session management with HTTP-only cookies
 * - Two-factor auth (optional)
 * - Password reset flow
 */

export const auth = betterAuth({
  // Use Drizzle adapter with our existing db
  adapter: drizzleAdapter(db, {
    usersTable: users,
    sessionsTable: sessions,
    accountsTable: accounts,
    verificationRequestsTable: verificationRequests,
  }),

  // Email & password authentication
  emailAndPassword: {
    enabled: true,
    forgotPassword: {
      enabled: true,
      requireEmailConfirmation: false, // For MVP, skip email confirmation
      email: {
        from: 'noreply@yourdomain.com',
        subject: 'Reset Your Password',
        // In production, configure actual email sending
        async send({ to, subject, text, html }) {
          console.log(`[Email] To: ${to}, Subject: ${subject}`);
          // TODO: Integrate with Resend/SendGrid/Mailgun
          // For now, just log in development
        },
      },
    },
  },

  // OAuth providers (configure after setting up Google)
  oauth: {
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Optional: additional scopes
      // scope: ['openid', 'profile', 'email'],
    } : undefined,
    // Add more providers as needed (GitHub, Twitter, etc.)
  },

  // Session configuration
  session: {
    cookieName: 'better-auth.session',
    cookiePrefix: 'ba',
    // Session TTL: 30 days
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000,
    // Secure cookies in production
    cookieSecure: process.env.NODE_ENV === 'production',
    // SameSite policy
    cookieSameSite: 'lax' as const,
  },

  // User management - can add custom fields
  user: {
    // Extended user fields (will be stored in users table metadata)
    // We'll add subscriptionStatus, polarCustomerId, etc.
  },

  // Security
  secretKey: process.env.BETTER_AUTH_SECRET,
  trustHost: process.env.NODE_ENV === 'production',
});

// Export types for use throughout the app
export type Auth = typeof auth;
