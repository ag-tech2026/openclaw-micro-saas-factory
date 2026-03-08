# Sentry Error Monitoring Setup Guide

This guide covers complete Sentry integration for error tracking, performance monitoring, and Telegram alerts.

## Configuration

### 1. Environment Variables

Set the following in your `.env.local` file and deployment platform (Vercel):

```bash
# Required for Sentry to work
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Adjust performance sampling (default: 0.1 = 10%)
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Note:** `SENTRY_AUTH_TOKEN` is required for source map uploads during build. Generate it at: https://sentry.io/settings/account/api/auth-tokens/

Required permissions for the auth token:
- `project:releases` (for uploading source maps)
- `project:write` (optional, for creating releases)

### 2. Vercel Deployment

In Vercel dashboard → Project Settings → Environment Variables:

Add all variables from `.env.local`, including:
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_TRACES_SAMPLE_RATE` (optional)

Source maps are automatically uploaded during `next build` via `@sentry/nextjs`.

## Features Implemented

### Error Capture

- **Client-side**: Error boundary captures React errors
- **Server-side**: API routes and SSR errors captured automatically
- **Stack traces**: Full stack traces included with all errors
- **User context**: User info can be set via `Sentry.setUser()`

### Breadcrumbs

Automatic breadcrumbs capture:
- **UI Clicks**: All button/link clicks (text, ID)
- **Navigation**: Route changes
- **HTTP requests**: fetch/XHR calls with method, URL, status, duration
- **Unhandled rejections**: Promise rejections

Manual breadcrumbs available in:
- `src/lib/sentry-breadcrumbs.ts`:
  - `addClickBreadcrumb()`
  - `addNavigationBreadcrumb()`
  - `addApiBreadcrumb()`
  - `addFormBreadcrumb()`
  - `addAuthBreadcrumb()`

### Performance Monitoring

- **Transactions**: Automatically tracked for page loads and API routes
- **Sample rate**: Configured via `SENTRY_TRACES_SAMPLE_RATE` (default 10%)
- **Custom transactions**: Use `Sentry.startTransaction()` for manual instrumentation

Example:
```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'custom-operation',
  op: 'task',
});

try {
  // Your code
  transaction.setData('key', 'value');
  transaction.finish();
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
}
```

## Telegram Alert Rules

To receive Telegram notifications for new errors:

### 1. Create a Telegram Bot

1. Message `@BotFather` on Telegram
2. Send `/newbot` and follow instructions
3. Save the bot token: `123456:ABCdef...`

### 2. Create a Telegram Channel

1. Create a new channel (e.g., "MyApp Alerts")
2. Add your bot as an administrator
3. Grant permission: "Post messages"

### 3. Get Channel ID

1. Add `@RawDataBot` to your channel
2. Post a test message
3. `@RawDataBot` will reply with JSON; extract `"chat":{"id":-100xxxxxxxxxx}`
4. The channel ID is the negative number (e.g., `-1001234567890`)

### 4. Configure Sentry Integration

1. In Sentry: Settings → Integrations → Telegram
2. Click "Add Integration"
3. Enter:
   - Bot Token: from step 1
   - Channel ID: from step 3
   - Channel name: your channel
4. Save

### 5. Create Alert Rule

1. Go to your project → Alerts → Create Alert Rule
2. Select "Issues" → "New issue created"
3. Set conditions (e.g., all errors)
4. Under "Send a notification":
   - Select your Telegram integration
   - Choose the channel
   - Customize message template if desired
5. Save

Now you'll receive notifications in Telegram when new errors appear.

## Verification

### 1. Test Error Capture

Create a test page or use browser console:

```javascript
// Client-side test
throw new Error('Sentry test error from client');

// Or via fetch to trigger server error
fetch('/api/hello').then(r => r.text());
```

Check Sentry dashboard for the error within a minute.

### 2. Test Performance Monitoring

In Sentry dashboard → Performance → Verify transactions appear.

### 3. Test Source Maps

1. Build the app: `npm run build`
2. Check build logs for "Uploading source maps" messages
3. In Sentry: Releases → Verify release created
4. Click a stack trace → Should show original TypeScript/TSX source

### 4. Test Telegram Alerts

Trigger a test error (as above) and confirm notification arrives in Telegram.

## Troubleshooting

### No errors appearing in Sentry

- Verify `SENTRY_DSN` is correct and not disabled in Sentry
- Check `ENABLE_ERROR_MONITORING=true`
- Ensure build includes `withSentryConfig` (check next.config.js)
- Look for upload errors in build logs

### Source maps not working

- Ensure `SENTRY_AUTH_TOKEN` is set in build environment
- Check `SENTRY_ORG` and `SENTRY_PROJECT` are correct
- In Sentry: Settings → Projects → Source Maps → Verify files uploaded
- Release name must match between build and Sentry

### Performance data missing

- Increase `SENTRY_TRACES_SAMPLE_RATE` to `1.0` temporarily for testing
- Check browser console for Sentry errors
- Verify `tracesSampleRate` is a number between 0 and 1

### Telegram alerts not working

- Verify bot is administrator in channel
- Check channel ID is correct (negative number)
- In Sentry: Settings → Integrations → Test the Telegram integration
- Ensure alert rule is enabled

## Advanced Configuration

### Custom Release Naming

In `next.config.js`, customize the `release` option:

```javascript
release: process.env.VERCEL_GIT_COMMIT_SHA || `myapp@${process.env.NEXT_PUBLIC_APP_URL}`,
```

### Error Filtering

Use `beforeSend` in `sentry.client.config.ts` or `sentry.server.config.ts` to filter/modify events before sending.

### User Context

Set user info in your auth flow:

```typescript
import { addServerContext } from '@/sentry.server.config';

addServerContext({ id: user.id, email: user.email });
```

## Additional Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Source Maps Upload](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)
