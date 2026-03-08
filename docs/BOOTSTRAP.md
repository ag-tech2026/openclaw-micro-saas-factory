# Comprehensive Bootstrap Guide

## OpenClaw Autonomous Micro-SaaS Factory

This guide walks you through setting up the entire autonomous micro-SaaS factory from a fresh OpenClaw installation. By the end, you'll have a fully functional system capable of building, deploying, and managing micro-SaaS MVPs autonomously.

**Estimated Time:** 4-6 hours

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Repository Setup](#initial-repository-setup)
3. [Neon Database Setup](#neon-database-setup)
4. [Authentication Setup (BetterAuth)](#authentication-setup-betterauth)
5. [Environment Configuration](#environment-configuration)
6. [Dependencies Installation](#dependencies-installation)
7. [Database Schema & Migrations](#database-schema--migrations)
8. [Build & Test Locally](#build--test-locally)
9. [Vercel Deployment](#vercel-deployment)
10. [Inngest Cron Job Configuration](#inngest-cron-job-configuration)
11. [Kanban Server Setup](#kanban-server-setup)
12. [Third-Party Integrations](#third-party-integrations)
13. [Production Readiness Checklist](#production-readiness-checklist)
14. [Troubleshooting](#troubleshooting)
15. [Next Steps](#next-steps)

---

## Prerequisites

### Required Accounts & Services

Create accounts on the following services before starting:

| Service | Purpose | Signup Link |
|---------|---------|-------------|
| **GitHub** | Code hosting | https://github.com/signup |
| **Vercel** | Deployment platform | https://vercel.com/signup |
| **Neon** | Serverless PostgreSQL | https://neon.tech/signup |
| **BetterAuth** | Authentication | https://betterauth.com |
| **Google Cloud Console** | OAuth 2.0 credentials | https://console.cloud.google.com |
| **OpenRouter** | AI vision API | https://openrouter.ai |
| **Polar** | Payment/subscription processing | https://polar.sh |
| **Sentry** | Error monitoring (optional) | https://sentry.io |
| **Plausible** | Analytics (optional) | https://plausible.io |

### Local Development Environment

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **VS Code** or similar editor (recommended)

Verify your setup:

```bash
node --version  # Should be v18.x or later
npm --version   # Should be 9.x or later
git --version   # Any recent version
```

---

## Initial Repository Setup

### 1. Clone or Initialize Repository

If starting from scratch:

```bash
# Create project directory
mkdir micro-saas-factory
cd micro-saas-factory

# Initialize Git
git init
git add .
git commit -m "Initial commit"
```

If the repository already exists with code:

```bash
git clone <repository-url>
cd micro-saas-factory
```

### 2. Install Dependencies

```bash
# Install main application dependencies
npm install

# Install additional dependencies for BetterAuth + Drizzle
npm install better-auth @neondatabase/serverless drizzle-orm pg

# Install development dependencies
npm install -D drizzle-kit @types/pg
```

*Note:* The project uses ES modules. Ensure your `package.json` includes `"type": "module`" or use `.mjs` extensions for Node scripts.

### 3. Verify Project Structure

After installation, your project should have:

```
micro-saas-factory/
├── src/
│   ├── app/                    # Main Next.js app router
│   │   ├── api/
│   │   │   ├── analyze/        # Vision analysis API
│   │   │   └── admin/usage/    # Admin usage endpoint
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── config.ts           # Environment config with Zod validation
│   │   ├── analytics.ts        # Plausible analytics
│   │   ├── inngest.ts          # Inngest client
│   │   ├── inngest/functions.ts # Background job functions
│   │   ├── inngest.config.ts
│   │   ├── rate-limiter.ts     # Rate limiting
│   │   ├── landing-config.ts   # Landing page config loader
│   │   └── pricing.ts          # Pricing utilities
│   ├── components/             # React components
│   └── types/                  # TypeScript type definitions
├── kanban/                     # Separate Kanban board app
├── landing-configs/            # JSON/YAML landing page configs
├── .env.example                # Environment template
├── next.config.js
├── package.json
├── drizzle.config.ts           # Will be created
└── src/db/                     # Will be created for Drizzle
```

---

## Neon Database Setup

### 1. Create Neon Project

1. Go to [Neon Console](https://console.neon.tech)
2. Click **New Project**
3. Name it: `micro-saas-factory` (or your preferred name)
4. Keep on **main** branch
5. Select region closest to your deployment target (e.g., `AWS US East (N. Virginia)`)
6. Click **Create Project**

### 2. Get Connection String

After creation:

1. In the Neon dashboard, go to **Connection Details**
2. Under **Pooled connection**, copy the connection string
   - Format: `postgresql://user:password@ep-xxx.pooler.neon.tech/dbname?sslmode=require`
3. Save it securely (you'll add it to `.env.local`)

### 3. Create Database (Optional)

By default, Neon creates a `main` database. If you want a separate database:

```sql
-- In Neon SQL Editor or via psql
CREATE DATABASE microsaas;
\c microsaas  -- Switch to it
```

For simplicity, use the default `main` database.

---

## Authentication Setup (BetterAuth)

BetterAuth provides email/password and OAuth authentication with session management.

### 1. Install BetterAuth CLI

```bash
npm install -D @better-auth/cli
```

### 2. Create Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth';
import { pg } from 'better-auth/adapters/pg';
import { Pool } from 'pg';

/**
 * BetterAuth configuration
 * Supports:
 * - Email & password authentication
 * - Google OAuth (optional)
 * - Session management with HTTP-only cookies
 */

export const auth = betterAuth({
  // Database adapter using pg (compatible with Drizzle/Neon)
  database: pg(new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Connection pool size
    idleTimeoutMillis: 30000,
  })),

  // Email & password auth
  emailAndPassword: {
    enabled: true,
    forgotPassword: {
      enabled: true,
      email: {
        from: 'noreply@yourdomain.com',
        subject: 'Reset Password',
      },
    },
  },

  // OAuth providers (optional, configure after setting up Google)
  oauth: {
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Optional: additional scopes
      // scope: ['openid', 'profile', 'email'],
    } : undefined,
  },

  // Session configuration
  session: {
    cookieName: 'better-auth.session',
    // Cookie settings
    cookiePrefix: 'ba',
    // Session TTL: 30 days
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000,
    // Secure cookies in production
    cookieSecure: process.env.NODE_ENV === 'production',
    // SameSite policy
    cookieSameSite: 'lax' as const,
  },

  // User management
  user: {
    // Additional user fields can be added here
    // e.g., role, subscriptionStatus, etc.
  },
});

// Export types for use throughout the app
export type Auth = typeof auth;
```

### 3. Create API Route

BetterAuth requires a catch-all API route. Create `src/app/api/auth/[...better-auth]/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Export GET and POST handlers for the catch-all route
export const { GET, POST } = toNextJsHandler(auth);
```

This single route handles:
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/reset-password` - Password reset
- OAuth callbacks (if configured)

### 4. Client-Side Auth Client

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  // Base URL of your application
  baseURL: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://localhost:3000',
  // How to send the session token
  token: 'cookie', // Uses HTTP-only cookie
});
```

### 5. Set Up Middleware for Protected Routes

Create `src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth';
import { authMiddleware } from 'better-auth/middleware';

// Apply BetterAuth middleware to protect routes
export default authMiddleware(auth, {
  // Pages that don't require authentication (public)
  publicPages: ['/api/auth', '/_next', '/_next/image', '/favicon.ico'],
  // Redirect unauthenticated users to sign-in page
  redirectTo: '/sign-in',
});

export const config = {
  // Apply to all pages except the specified matchers
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 6. Update Root Layout

Modify `src/app/layout.tsx` to include session provider:

```tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider'; // Will create next

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Micro-SaaS Factory',
  description: 'Autonomous micro-SaaS development platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

Create `src/components/AuthProvider.tsx`:

```tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // Initialize auth client on mount
    // This sets up cookie-based session handling
  }, []);

  return <>{children}</>;
}
```

---

## Environment Configuration

### 1. Create `.env.local`

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

### 2. Required Environment Variables

Edit `.env.local` with your actual values:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon)
DATABASE_URL=postgresql://user:password@ep-xxx.pooler.neon.tech/dbname?sslmode=require

# BetterAuth
BETTER_AUTH_SECRET=generate-a-random-32-byte-secret-here
# Optional: For OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenRouter (AI Vision)
OPENROUTER_API_KEY=your-openrouter-api-key

# Polar (Payments)
POLAR_CLIENT_ID=your-polar-client-id
POLAR_CLIENT_SECRET=your-polar-client-secret
POLAR_WEBHOOK_SECRET=your-polar-webhook-secret

# Sentry (Error Monitoring - optional)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
ENABLE_ERROR_MONITORING=true

# Plausible (Analytics - optional)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io
ENABLE_ANALYTICS=true

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_ADMIN_SECRET=change-this-admin-secret

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_ERROR_MONITORING=true
```

### 3. Generate BetterAuth Secret

Generate a secure random secret for BetterAuth:

```bash
# On Linux/macOS
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Paste the output into `BETTER_AUTH_SECRET`.

### 4. Set Up Google OAuth (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-production-domain.com/api/auth/google/callback
   ```
7. Create and copy **Client ID** and **Client Secret** to `.env.local`
8. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Dependencies Installation

### 1. Install All Packages

```bash
# Clean install (optional)
rm -rf node_modules
npm ci

# Or regular install
npm install
```

### 2. Install Drizzle Kit Globally (Optional)

For easier access to Drizzle CLI:

```bash
npm install -g drizzle-kit
```

Or use npx: `npx drizzle-kit`

---

## Database Schema & Migrations

### 1. Configure Drizzle

Create `drizzle.config.ts` in the project root:

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/load';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // BetterAuth uses the public schema
  schemaFilter: ['public'],
  // Optional: verbose output during development
  verbose: true,
});
```

### 2. Create Database Directory

```bash
mkdir -p src/db
```

### 3. Generate Schema from BetterAuth

BetterAuth includes Drizzle-compatible schema definitions. Generate the schema:

```bash
npx @better-auth/cli@latest generate
```

This creates a Drizzle schema file at `src/db/schema.ts` with tables:
- `users`
- `sessions`
- `accounts` (for OAuth)
- `verifications` (for email verification)

**Important:** The CLI generates the schema based on your `auth` configuration. Review `src/db/schema.ts` to ensure it matches your needs.

### 4. Create Drizzle Client

Create `src/db/index.ts`:

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Create Neon HTTP client (serverless)
const sql = neon(process.env.DATABASE_URL!);

// Create Drizzle instance
export const db = drizzle(sql);

// Export types
export * from './schema';
```

### 5. Run Database Migrations

Apply the generated schema to your Neon database:

```bash
npx @better-auth/cli@latest migrate
```

You'll be prompted to confirm. Type `Y` to proceed.

**What this does:**
- Creates the authentication tables in your Neon database
- Sets up proper indexes and constraints
- Uses Drizzle's migration system

### 6. Verify Tables in Neon

1. Go to Neon dashboard
2. Open **SQL Editor**
3. Run: `\dt` (list tables)
4. You should see: `users`, `sessions`, `accounts`, `verifications`

---

## Build & Test Locally

### 1. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Test Authentication Flow

1. Navigate to `/sign-up` (or create a sign-up page)
2. Register a new user with email/password
3. Verify in Neon SQL Editor:
   ```sql
   SELECT * FROM users;
   SELECT * FROM sessions;
   ```
4. Test login/logout functionality

**Create a simple sign-up page** (`src/app/sign-up/page.tsx`):

```tsx
'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      alert('Sign up successful! Check your email for verification (if enabled).');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold">Sign Up</h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3. Test Vision Analysis API

Check that the analyze endpoint is working:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

Expected response (202 Accepted):
```json
{
  "success": true,
  "message": "Analysis queued",
  "requestId": "vision-1234567890-abc123",
  "function": "process-vision-analysis",
  "enqueuedAt": "2025-03-08T15:30:00.000Z",
  "eventId": "evt_xxx",
  "statusUrl": "/api/analyze/status/vision-1234567890-abc123"
}
```

### 4. Test Landing Pages

If you have landing page configs in `landing-configs/`, start the dev server and visit:

- `/` - Main homepage
- `/product/example-saas` - Dynamic landing pages
- `/calculator` - Pricing calculator

### 5. Build Production Bundle

Verify that the production build succeeds:

```bash
npm run build
```

This should complete without errors. If there are TypeScript errors, fix them before proceeding.

---

## Vercel Deployment

### 1. Push to GitHub

```bash
# If remote not configured yet
git remote add origin https://github.com/yourusername/micro-saas-factory.git
git branch -M main

# Push
git push -u origin main
```

### 2. Import Project into Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project**
3. Import your GitHub repository
4. Framework preset: **Next.js** (auto-detected)
5. Root directory: `.` (root of repository)
6. Build command: `npm run build` (default)
7. Output directory: `.next` (default)

### 3. Configure Environment Variables in Vercel

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add all variables from your local `.env.local`:
   - `NODE_ENV` → `production`
   - `NEXT_PUBLIC_APP_URL` → Your Vercel domain (e.g., `https://micro-saas-factory.vercel.app`)
   - `DATABASE_URL` (Neon connection)
   - `BETTER_AUTH_SECRET`
   - `GOOGLE_CLIENT_ID` (if using OAuth)
   - `GOOGLE_CLIENT_SECRET` (if using OAuth)
   - `OPENROUTER_API_KEY`
   - `POLAR_CLIENT_ID`
   - `POLAR_CLIENT_SECRET`
   - `POLAR_WEBHOOK_SECRET`
   - `SENTRY_DSN` (if using)
   - `SENTRY_ORG` (if using)
   - `SENTRY_PROJECT` (if using)
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (if using)
   - `RATE_LIMIT_MAX_REQUESTS`
   - `RATE_LIMIT_WINDOW_MS`
   - `RATE_LIMIT_ADMIN_SECRET`

3. Select **Production** and **Preview** environments as needed
4. Click **Save**

### 4. Deploy

1. In Vercel dashboard, click **Deploy**
2. Wait for build to complete (3-5 minutes)
3. Once deployed, visit your production URL
4. Test sign-up and login functionality

### 5. Configure Custom Domain (Optional)

1. In Vercel project, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `app.yoursaas.com`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables
5. Add redirects in Neon OAuth if using Google

### 6. Deploy Kanban Board Separately

The kanban board is a separate Next.js app and should be deployed independently:

```bash
cd kanban
npm install
npm run build
```

Deploy to Vercel or any other platform:

```bash
# Option A: Deploy to Vercel (recommended)
vercel --prod

# Option B: Build and serve locally
npm run build
npm start
```

If deploying separately, set `NEXT_PUBLIC_APP_URL` accordingly.

---

## Inngest Cron Job Configuration

Inngest handles background job queues and scheduled cron tasks.

### 1. Create Inngest Account

1. Go to [Inngest Dashboard](https://dashboard.inngest.com)
2. Sign up with your GitHub account
3. Create a new **App**:
   - Name: `micro-saas-factory`
   - Environment: `Production`
4. Copy the **Event Key** (looks like `ink_xxxxxx`)

### 2. Add Inngest Environment Variables

Add to `.env.local` and Vercel:

```env
INNGEST_EVENT_KEY=ink_your_event_key_here
INNGEST_DEV=true  # Set to false in production
```

### 3. Serve Inngest Functions

The project already has `src/lib/inngest.ts` and `src/lib/inngest/functions.ts`. Ensure the API route exists:

**File:** `src/app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import * as functions from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    functions.processVisionAnalysis,
    functions.batchProcessVisionAnalysis,
    // Add more functions here
  ],
});
```

*If the file doesn't exist, create it with the above content.*

### 4. Deploy Inngest Functions

#### Option A: Auto-Deploy (Recommended)

Inngest automatically discovers functions from your deployed Vercel app:

1. Deploy your Next.js app to Vercel (already done)
2. In Inngest dashboard, go to your app
3. Click **Connect**
4. Enter your Vercel app URL: `https://your-app.vercel.app/api/inngest`
5. Inngest will poll the endpoint and register functions automatically

#### Option B: Manual via CLI

```bash
# Install Inngest CLI
npm install -g inngest

# Login
inngest login

# Deploy functions (runs in your CI/CD)
inngest deploy --key $INNGEST_EVENT_KEY
```

### 5. Create Scheduled Cron Jobs

Add a new function for periodic tasks. Example: Daily usage cleanup

Create `src/lib/inngest/cron.ts`:

```typescript
import { inngest } from './inngest';

/**
 * Daily cleanup: Remove expired sessions, old logs, etc.
 * Runs every day at 2 AM UTC
 */
export const dailyCleanup = inngest.createFunction(
  {
    id: 'daily-cleanup',
    name: 'Daily Cleanup',
    description: 'Cleanup expired sessions, logs, and temporary data',
  },
  { cron: '0 2 * * *' }, // Every day at 2 AM UTC
  async ({ step }) => {
    // Example: Clean up expired sessions
    // await step.run('cleanup-sessions', async () => {
    //   await db.execute(`
    //     DELETE FROM sessions
    //     WHERE expires_at < NOW()
    //   `);
    // });

    // Example: Clean up completed analysis logs older than 30 days
    // await step.run('cleanup-logs', async () => {
    //   const cutoff = new Date();
    //   cutoff.setDate(cutoff.getDate() - 30);
    //   await db.execute(`
    //     DELETE FROM vision_analysis_logs
    //     WHERE completed_at < $1
    //   `, [cutoff.toISOString()]);
    // });

    console.log('Daily cleanup completed');
    return { cleanedAt: new Date().toISOString() };
  }
);
```

Update `src/app/api/inngest/route.ts` to include the new function:

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import * as functions from '@/lib/inngest/functions';
import { dailyCleanup } from '@/lib/inngest/cron';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    functions.processVisionAnalysis,
    functions.batchProcessVisionAnalysis,
    dailyCleanup, // Add here
  ],
});
```

### 6. Test Local Inngest Development

1. Start Next.js dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, start Inngest dev:
   ```bash
   inngest dev --key $INNGEST_EVENT_KEY
   ```

3. Visit `http://localhost:3000/api/inngest` to verify functions are registered

4. In Inngest dashboard, you can trigger test events manually

**Trigger test event:**

```bash
curl -X POST http://localhost:3000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vision/analysis.requested",
    "data": {
      "imageUrl": "https://example.com/test.jpg",
      "requestId": "test-" + Date.now()
    }
  }'
```

---

## Kanban Server Setup

The kanban board is a separate Next.js application for task management.

### 1. Install Dependencies

```bash
cd kanban
npm install
```

### 2. Configure Environment

The kanban app doesn't require environment variables for basic operation, as it uses localStorage.

If you want to add backend persistence later, you would:
- Create a database table for tasks
- Add API routes in the kanban app
- Replace localStorage with API calls

### 3. Run Development Server

```bash
cd kanban
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or the port shown in terminal)

### 4. Build Production Version

```bash
cd kanban
npm run build
npm start
```

### 5. Deploy Kanban to Vercel (Optional)

```bash
cd kanban
vercel --prod
```

---

## Third-Party Integrations

### Polar Payments Setup

#### 1. Create Polar Account

1. Go to [Polar.sh](https://polar.sh) and sign up
2. Create a new **Organization**
3. Go to **Developer** → **API Keys**
4. Copy **Client ID** and **Client Secret**
5. Create a **Webhook Secret** (random string)

#### 2. Add Polar Credentials

Add to `.env.local`:

```env
POLAR_CLIENT_ID=your_polar_client_id
POLAR_CLIENT_SECRET=your_polar_client_secret
POLAR_WEBHOOK_SECRET=your_webhook_secret
```

#### 3. Configure Products

In Polar dashboard:
- Create products (one-time or subscription)
- Copy `product_id` for each
- Add to your landing page configs under `pricing.polarProductId`

#### 4. Set Up Webhooks (Optional)

Configure webhooks to handle payment events:
- `subscription.created`
- `subscription.canceled`
- `subscription.updated`
- `payment.succeeded`

Create `src/app/api/polar/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { crypto } from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('polar-signature') || '';
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', secret!)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle different event types
  switch (event.type) {
    case 'subscription.created':
      // Grant access to user
      await handleSubscriptionCreated(event.data);
      break;
    case 'subscription.canceled':
      // Revoke access
      await handleSubscriptionCanceled(event.data);
      break;
    // ... other events
  }

  return NextResponse.json({ received: true });
}
```

### OpenRouter Setup

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up and verify your account
3. Go to **API Keys**
4. Create a new key (choose model access)
5. Copy key to `.env.local`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxx
   ```

6. Test the API:

```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Sentry Error Monitoring (Optional)

1. Create Sentry account and project
2. Get DSN from project settings
3. Add to `.env.local`:
   ```env
   SENTRY_DSN=https://key@o123456.ingest.sentry.io/1234567
   SENTRY_ORG=your-org
   SENTRY_PROJECT=your-project
   ```

4. Build with Sentry source maps:

```bash
# Install Sentry CLI globally
npm install -g @sentry/cli

# Authenticate
sentry-cli login

# After building, upload source maps
sentry-cli releases new $(git rev-parse --short HEAD)
sentry-cli releases files $(git rev-parse --short HEAD) upload-sourcemaps .next
sentry-cli releases finalize $(git rev-parse --short HEAD)
```

Or automate in CI/CD (Vercel):

```bash
# In Vercel, add environment variable SENTRY_AUTH_TOKEN
# Then add build step:
# sentry-cli releases new $VERCEL_GIT_COMMIT_SHA
# next build
# sentry-cli releases files $VERCEL_GIT_COMMIT_SHA upload-sourcemaps .next
# sentry-cli releases finalize $VERCEL_GIT_COMMIT_SHA
```

### Plausible Analytics (Optional)

1. Sign up at Plausible.io
2. Add your domain in Plausible dashboard
3. Copy domain to `.env.local`:
   ```env
   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
   NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io
   ```

The analytics script is automatically injected via the PlausibleAnalytics component in `src/components/PlausibleAnalytics.tsx`.

---

## Production Readiness Checklist

Before going live, verify all items:

### Security
- [x] `BETTER_AUTH_SECRET` set and random
- [x] `DATABASE_URL` uses Neon (serverless, auto-scaling)
- [x] All environment variables in production (Vercel)
- [x] HTTPS enabled (Vercel provides automatically)
- [x] Rate limiting configured and tested
- [x] No secrets exposed to client (`NEXT_PUBLIC_*` only for needed vars)
- [x] Polar webhook signature verification implemented (if using webhooks)
- [x] CORS properly configured (default Next.js is safe)

### Database
- [x] Neon project created
- [x] Schema migrated (`npx @better-auth/cli migrate`)
- [x] Tables exist in production Neon DB
- [x] Connection string works in production
- [x] Connection pool configured (max connections appropriate for Neon plan)

### Authentication
- [x] BetterAuth API routes working
- [x] Sign-up and sign-in functional
- [x] Sessions persist across page reloads
- [x] Protected routes redirect correctly
- [x] Logout clears session
- [x] OAuth callback URLs configured in Google Console for production domain

### Payments
- [x] Polar products created
- [x] Product IDs in landing page configs
- [x] Checkout flow tested (use Polar test mode)
- [x] Webhook endpoint configured in Polar dashboard
- [x] Webhook signature verification works
- [x] Subscription status properly granted/revoked

### AI/Background Jobs
- [x] OpenRouter API key valid
- [x] Vision analysis endpoint returns 202 Accepted
- [x] Inngest functions registered (check dashboard)
- [x] Cron jobs configured and scheduled
- [x] Inngest dev mode works locally
- [x] Production Inngest connected to Vercel app

### Deployment
- [x] Vercel project created and linked to GitHub
- [x] All environment variables set in Vercel
- [x] Build succeeds without errors
- [x] Production URL accessible
- [x] Custom domain configured (if needed)
- [x] Kanban app deployed (separate from main app)

### Monitoring
- [x] Sentry integrated (optional but recommended)
- [x] Plausible analytics configured (optional)
- [x] Rate limit headers present on API responses
- [x] Error boundaries in place (`src/app/error.tsx`)
- [x] Logging set up for critical paths

### Performance
- [x] Build optimized (`npm run build` passes)
- [x] No large uncompressed images in public folder
- [x] API routes have reasonable timeouts
- [x] Database queries efficient (indexes where needed)

### Testing
- [x] Sign-up flow tested end-to-end
- [x] Vision analysis API tested with real image
- [x] Landing pages render correctly
- [x] Responsive design works on mobile
- [x] Pricing calculator functional
- [x] All API routes respond correctly

---

## Troubleshooting

### Database Connection Issues

**Symptom:** `Error: password authentication failed for user "..."`

**Solution:**
1. Verify `DATABASE_URL` in `.env.local` is correct
2. Ensure Neon connection string includes `?sslmode=require`
3. Check that the database user exists and password is correct in Neon dashboard

**Symptom:** `Error: connect ECONNREFUSED` or timeout

**Solution:**
1. Ensure Neon project is active (not paused)
2. Check that your IP is allowed (Neon has IP allowlist option)
3. Verify `DATABASE_URL` uses the pooled endpoint (`ep-xxx.pooler.neon.tech`)

**Symptom:** `relation "users" does not exist`

**Solution:**
1. Migrations haven't been run: `npx @better-auth/cli migrate`
2. Check that you're connected to the correct database
3. Verify tables in Neon SQL Editor: `\dt`

### BetterAuth Issues

**Symptom:** 404 on `/api/auth/...`

**Solution:**
1. Ensure catch-all route exists: `src/app/api/auth/[...better-auth]/route.ts`
2. File name must be exactly `[...better-auth]` (three dots)
3. Restart dev server after creating route

**Symptom:** Session not persisting

**Solution:**
1. Check `BETTER_AUTH_SECRET` is set and matches between requests
2. Verify cookie settings: `cookieSecure` should be `false` in development unless using HTTPS
3. Check browser dev tools: Application → Cookies → Domain should have `better-auth.session`
4. Ensure middleware is configured correctly in `src/middleware.ts`

**Symptom:** OAuth callback fails

**Solution:**
1. Verify redirect URI in Google Cloud Console matches exactly:
   - Dev: `http://localhost:3000/api/auth/google/callback`
   - Prod: `https://yourdomain.com/api/auth/google/callback`
2. Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
3. Ensure dates/times are correct on your machine (OAuth tokens can fail with clock skew)

### Inngest Not Working

**Symptom:** Functions not appearing in Inngest dashboard

**Solution:**
1. Verify `/api/inngest` route is deployed and accessible
2. Check that `INNGEST_EVENT_KEY` is set in production
3. In Inngest dashboard, manually sync functions from your app URL
4. Check Vercel logs for errors in `/api/inngest` endpoint

**Symptom:** Events being queued but not processed

**Solution:**
1. In Inngest dashboard, go to **Functions** → select function → **Runs**
2. Check for errors (red exclamation marks)
3. Common issues:
   - Missing `OPENROUTER_API_KEY` in production
   - Function timeout (increase `timeout` in function config)
   - Unhandled errors (wrap in try/catch, use `step.run`)

### Vercel Deployment Failures

**Symptom:** Build fails on Vercel but works locally

**Solution:**
1. Check Vercel build logs for specific errors
2. Common causes:
   - Missing environment variables in Vercel (add all from `.env.local`)
   - Node.js version mismatch (set in `package.json` engines)
   - Import path issues (case-sensitive file system differences)
   - Native module compilation fails (e.g., `better-sqlite3` - use `@neondatabase/serverless` instead)

**Symptom:** 500 error after deployment

**Solution:**
1. Check Vercel Function logs in dashboard
2. Verify all environment variables are present
3. Check that `DATABASE_URL` works from Vercel (Neon allows connections from Vercel IPs)
4. Look for runtime errors in `/api` routes

### Polar Integration Issues

**Symptom:** Checkout fails or returns error

**Solution:**
1. Verify `POLAR_CLIENT_ID` and `POLAR_CLIENT_SECRET` are correct
2. Check Polar dashboard: Organization → Settings → Callback URLs must include your domain
3. Ensure product IDs in config are valid and belong to your Polar organization
4. Test in Polar sandbox mode first

**Symptom:** Webhook not firing or failing

**Solution:**
1. In Polar dashboard, verify webhook URL is correct: `https://yourdomain.com/api/polar/webhook`
2. Check that `POLAR_WEBHOOK_SECRET` matches in both Polar and your `.env.local`
3. Verify webhook endpoint returns 2xx status code
4. Check Vercel logs for webhook request logs

### OpenRouter API Errors

**Symptom:** 429 Too Many Requests or 402 Insufficient Funds

**Solution:**
1. Check your OpenRouter account balance and usage
2. Add caching layer to reduce redundant calls
3. Consider upgrading to a higher-tier model or optimizing prompts

**Symptom:** 401 Unauthorized

**Solution:**
1. Verify `OPENROUTER_API_KEY` is correct and active
2. Check that API key has access to the model you're using (some models require separate purchase)

### Rate Limiting Too Aggressive

**Symptom:** Legitimate users hitting rate limits quickly

**Solution:**
1. Increase `RATE_LIMIT_MAX_REQUESTS` in environment
2. Increase `RATE_LIMIT_WINDOW_MS` (e.g., 3600000 = 1 hour, 86400000 = 1 day)
3. Consider implementing tiered rate limits based on user subscription
4. Adjust `getUserId()` in middleware to use authenticated user ID instead of IP for logged-in users

### TypeScript Errors

**Symptom:** Build fails with type errors

**Solution:**
1. Run `npx tsc --noEmit` to check types locally
2. Install missing type definitions: `@types/package-name`
3. Ensure `tsconfig.json` has strict mode enabled
4. Some packages may need `"skipLibCheck": true` in `tsconfig.json`

### Neon Database Paused

**Symptom:** Slow queries or connection timeouts after inactivity

**Solution:**
Neon automatically pauses compute after inactivity (default 5 minutes). First query after pause will be slower (cold start). To prevent:
- Upgrade Neon plan to keep compute always active
- Or accept cold start latency (~1-2 seconds)

---

## Next Steps

After completing the bootstrap, you can:

1. **Build Your First Micro-SaaS Product:**
   - Choose a niche from `research/niches.md` (e.g., Social Media Content Moderation)
   - Create a landing page config in `landing-configs/`
   - Customize the vision analysis prompt for your use case
   - Configure Polar product with appropriate pricing
   - Deploy and launch!

2. **Enhance the Autonomous System:**
   - Add more Inngest functions for automated tasks (e.g., daily usage reports, billing emails)
   - Implement affiliate referral tracking
   - Build MRR dashboard
   - Set up automated social media posting

3. **Scale Infrastructure:**
   - Set up GitHub Actions for automated testing
   - Add monitoring (Sentry alerts, uptime checks)
   - Implement backup strategy for Neon database
   - Set up custom email domain for transactional emails

4. **Optimize Performance:**
   - Add Redis for caching frequent queries
   - Implement image CDN for user uploads
   - Optimize OpenRouter API calls with prompt engineering
   - Add edge caching for landing pages

5. **Monitor and Iterate:**
   - Track MRR in the kanban board or separate dashboard
   - Monitor usage metrics and API costs
   - Gather user feedback
   - Iterate on pricing and features

---

## Support Resources

- **Next.js Docs:** https://nextjs.org/docs
- **BetterAuth Docs:** https://betterauth.com/docs
- **Neon Docs:** https://neon.tech/docs
- **Drizzle ORM Docs:** https://orm.drizzle.team
- **Inngest Docs:** https://www.inngest.com/docs
- **Polar Docs:** https://polar.sh/docs
- **OpenRouter Docs:** https://openrouter.ai/docs
- **Vercel Docs:** https://vercel.com/docs

---

## Quick Reference: Common Commands

```bash
# Development
npm run dev                    # Start dev server (main app)
cd kanban && npm run dev      # Start dev server (kanban)

# Building
npm run build                  # Build production bundle
cd kanban && npm run build    # Build kanban

# Database
npx @better-auth/cli generate  # Generate Drizzle schema
npx @better-auth/cli migrate   # Apply migrations
npx drizzle-kit studio         # Open Drizzle Studio (DB browser) if configured

# Inngest
npx drizzle-kit generate       # Generate new migration
inngest dev                    # Start Inngest dev server
inngest deploy --key <key>     # Deploy functions via CLI

# Deployment
git push origin main           # Push to trigger Vercel auto-deploy
vercel --prod                  # Manual Vercel deploy
cd kanban && vercel --prod     # Deploy kanban

# Testing
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"imageUrl":"https://example.com/image.jpg"}'
```

---

**You're ready to build your autonomous micro-SaaS empire! 🚀**

If you encounter issues not covered here, check the project's GitHub Issues or consult the linked documentation.
