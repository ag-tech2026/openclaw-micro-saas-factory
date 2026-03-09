# Next.js MVP Boilerplate

[![Accessibility Tests](https://github.com/your-username/your-repo/actions/workflows/a11y.yml/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/a11y.yml)
[![Performance](https://github.com/your-username/your-repo/actions/workflows/performance.yml/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/performance.yml)
[![Security](https://github.com/your-username/your-repo/actions/workflows/security.yml/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/security.yml)

A production-ready Next.js 15 boilerplate with environment configuration, error monitoring, analytics, and comprehensive documentation for rapid MVP deployment.

**🚀 Deployed via Vercel with automatic CI/CD**

## Features

- **Security Scanning**: Automated vulnerability detection with Snyk and Dependabot (critical issues fail CI)
- **Environment Configuration**: Type-safe env var loading with Zod validation and clear error messages
- **Error Monitoring**: Sentry integration with global error boundaries for client and server-side errors
- **Health Monitoring**: Comprehensive system health dashboard with real-time metrics, alerts, and admin actions ([docs](HEALTH_DASHBOARD.md))
- **Analytics**: Plausible Analytics support with event tracking utilities
- **TypeScript**: Full TypeScript support with strict type checking
- **ESLint**: Configured for Next.js and TypeScript best practices
- **Dark Mode Ready**: Tailwind CSS with dark mode support

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- A [Plausible Analytics](https://plausible.io) account (optional but recommended)
- A [Sentry](https://sentry.io) account (optional but recommended)

### Installation

1. **Clone or copy this boilerplate**

```bash
# If using git
git clone <your-repo-url>
cd nextjs-mvp-boilerplate
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Configure environment variables**

```bash
# Copy the example env file
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Required for analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io

# Required for error monitoring (optional but recommended)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Optional: AI API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Optional: Polar for payments/subscriptions
POLAR_CLIENT_ID=your-polar-client-id
POLAR_CLIENT_SECRET=your-polar-client-secret
POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
```

4. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Configuration Details

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `NODE_ENV` | `development \| production \| test` | Current environment mode |
| `NEXT_PUBLIC_APP_URL` | URL | Your application URL |

### Analytics Variables

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | string | Your Plausible domain (e.g., `yourdomain.com`) |
| `NEXT_PUBLIC_PLAUSIBLE_API_HOST` | URL | Plausible API endpoint (default: `https://plausible.io`) |
| `ENABLE_ANALYTICS` | boolean | Enable/disable analytics (default: `true`) |

### Error Monitoring Variables

| Variable | Type | Description |
|----------|------|-------------|
| `SENTRY_DSN` | URL | Sentry DSN for error reporting |
| `SENTRY_ORG` | string | Sentry organization slug |
| `SENTRY_PROJECT` | string | Sentry project name |
| `ENABLE_ERROR_MONITORING` | boolean | Enable/disable Sentry (default: `true`) |

### API Keys

| Variable | Type | Description |
|----------|------|-------------|
| `OPENAI_API_KEY` | string | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | string | Anthropic API key for AI features |

### Payment Integration

| Variable | Type | Description |
|----------|------|-------------|
| `POLAR_CLIENT_ID` | string | Polar OAuth client ID |
| `POLAR_CLIENT_SECRET` | string | Polar client secret |
| `POLAR_WEBHOOK_SECRET` | string | Polar webhook signing secret |

## Analytics Setup

### Plausible Analytics

1. Sign up at [plausible.io](https://plausible.io)
2. Add your domain in the Plausible dashboard
3. Copy your domain to `.env.local` as `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
4. The analytics script is automatically injected in `<Layout />`

### Tracking Events

Use the analytics hook in your components:

```typescript
'use client';

import { useAnalytics } from '@/lib/analytics';

function MyComponent() {
  const { trackEvent } = useAnalytics();

  const handleClick = () => {
    trackEvent('button_click', {
      button_name: 'sign_up',
      location: 'header',
    });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

For server-side tracking:

```typescript
import { analytics } from '@/lib/analytics';

// In server actions or API routes
await analytics.sendManualEvent('conversion', {
  name: 'purchase',
  amount: 99.99,
});
```

## Error Monitoring

### Setting up Sentry

1. Create an account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Get your DSN, org slug, and project name
4. Add these to your `.env.local`:

```env
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/1234567
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Build-time Configuration

For automatic source maps and better error reporting, set `SENTRY_AUTH_TOKEN` in your CI/CD environment:

```env
SENTRY_AUTH_TOKEN=sntrys_your_auth_token_here
```

### Manual Error Reporting

```javascript
import * as Sentry from '@sentry/nextjs';

try {
  // some code that throws
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'payments' },
    extra: { userId: '123' },
  });
}
```

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── layout.tsx         # Root layout with ErrorBoundary
│   ├── page.tsx           # Homepage
│   ├── error.tsx          # Error page
│   └── globals.css        # Global styles
├── components/
│   ├── ErrorBoundary.tsx  # Client-side error boundary
│   └── PlausibleAnalytics.tsx
└── lib/
    ├── config.ts          # Environment config with validation
    ├── analytics.ts       # Analytics utilities
    └── sentry/            # Sentry configuration (auto-generated)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at `http://localhost:3000` |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

### Vercel

1. Push your code to a Git repository
2. Import project into Vercel
3. Add environment variables in Vercel dashboard (Production and Preview)
4. Deploy

### Netlify

1. Build command: `npm run build`
2. Publish directory: `.next`
3. Add environment variables in Netlify dashboard
4. Deploy

### Any Other Platform

```bash
npm run build
npm start
```

Ensure your platform supports Node.js 18+ and has all environment variables configured.

## Health Monitoring

A comprehensive health monitoring system is included, providing real-time insights into system performance, API health, database status, business metrics, and external integrations.

### Features

- **Real-time Dashboard**: Interactive UI at `/admin/health` with status grid, charts, and alerts
- **Scheduled Collection**: Inngest collects metrics every 5 minutes
- **Configurable Alerts**: Get notifications via Telegram, Email (Resend), or Slack when thresholds are breached
- **Admin Actions**: Restart gateway, clear cache, toggle maintenance mode, trigger manual checks
- **Audit Logging**: All admin actions logged for compliance

### Setup

1. **Configure thresholds** (optional) in `.env.local`:
   ```env
   HEALTH_ALERT_DB_LATENCY_MS=200
   HEALTH_ALERT_ERROR_RATE_PCT=5
   HEALTH_ALERT_CPU_PCT=80
   HEALTH_ALERT_DISK_PCT=90
   HEALTH_ALERT_MRR_DROP_PCT=10
   ```

2. **Configure alert channels** (optional):
   ```env
   HEALTH_ALERT_TELEGRAM_BOT_TOKEN=your_bot_token
   HEALTH_ALERT_TELEGRAM_CHAT_ID=your_chat_id
   HEALTH_ALERT_EMAIL_TO=alerts@yourdomain.com
   HEALTH_ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
   ```

3. **Run database migrations** to create health tables:
   ```bash
   npm run db:migrate
   ```

4. **Access the dashboard** at `/admin/health` (requires admin login with 2FA)

### Documentation

- [Health Dashboard Guide](HEALTH_DASHBOARD.md) - Full feature documentation
- [Health Checks Developer Guide](HEALTH_CHECKS_DEV_GUIDE.md) - Adding custom modules
- [Alert Threshold Tuning](ALERT_THRESHOLD_TUNING.md) - Calibration best practices

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health/status` | Comprehensive health status (admin) |
| `GET /api/health/history?metric=xxx&range=24h` | Time-series data for charts |
| `GET /api/health/checks/:module` | Run specific health check on demand |
| `POST /api/health/actions/:action` | Execute admin actions |
| `GET /api/health/alerts` | List recent alerts |
| `PATCH /api/health/alerts` | Bulk resolve alerts |

The simple public health endpoint (`/api/health`) remains available for load balancers and status pages.

## TypeScript

This project uses TypeScript with strict mode enabled. All files should be `.tsx` or `.ts`.

To add type definitions for global variables:

```typescript
// src/types/globals.d.ts
interface Window {
  plausible: (...args: any[]) => void;
}
```

## ESLint

The included ESLint configuration extends the Next.js recommended rules with TypeScript support.

To fix linting issues automatically:

```bash
npx eslint . --ext .ts,.tsx --fix
```

## Browser Support

- Last 2 versions of Chrome, Firefox, Safari, Edge
- IE not supported

## Accessibility Testing

This project includes automated accessibility testing using axe-core and Playwright.

### Running Tests Locally

```bash
# Run accessibility tests against critical pages
npm run a11y
```

This will scan the following pages:
- `/` (homepage)
- `/sign-in` (sign-in)
- `/admin` (admin dashboard)
- `/calculator` (calculator)

Tests run against `http://localhost:3000` by default. To test a different URL:

```bash
NEXT_PUBLIC_APP_URL=https://your-production-url.com npm run a11y
```

### Results

- **Console output**: Violations summary
- **HTML report**: `reports/a11y-report-[timestamp].html`
- **JSON summary**: `reports/a11y-summary-[timestamp].json`

### CI/CD Integration

Accessibility tests run automatically on every PR and push to main via GitHub Actions. The build fails if:
- Critical violations > 0
- Serious violations > 0
- Moderate violations > 10
- Minor violations > 20

Thresholds can be adjusted in `scripts/a11y-test.ts`.

Reports are uploaded as artifacts for each run, and results are posted as PR comments.

### Threshold Configuration

Edit `scripts/a11y-test.ts` to adjust the violation thresholds:

```typescript
const THRESHOLDS = {
  critical: 0,   // Must be 0
  serious: 0,    // Adjust as needed
  moderate: 10,  // Warnings allowed
  minor: 20      // Minor issues allowed
};
```

## Performance Monitoring

This project includes automated performance auditing using Lighthouse CI. Performance budgets are enforced on every pull request to prevent regressions.

### Performance Budgets

- **Largest Contentful Paint (LCP)**: < 2 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Total Blocking Time (TBT)**: < 150ms
- **Performance score**: ≥ 90/100
- **Accessibility, Best Practices, SEO**: ≥ 90/100 each

### Running Locally

1. Start your development or production server:

```bash
npm run build
npm start
```

2. In another terminal, run Lighthouse CI:

```bash
npm run lighthouse
```

This will:
- Run 3 Lighthouse audits against `http://localhost:3000`
- Fail if any budget is exceeded
- Upload a temporary report (visible in console output)
- Store results in `.lighthouseci/`

### CI/CD Integration

Performance tests run automatically on every PR and push to main via GitHub Actions.

The workflow:
1. Installs dependencies
2. Builds the Next.js app
3. Starts the production server
4. Waits for the server to be ready
5. Runs Lighthouse CI with 3 iterations
6. Fails the build if performance budgets are exceeded
7. Uploads detailed Lighthouse reports as build artifacts (retained for 14 days)

You can view the performance badge at the top of this README.

### Customizing Budgets

Edit `lighthouse.config.js` to adjust performance thresholds:

```javascript
assert: {
  assertions: {
    'performance.largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
    'performance.cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    // Adjust other metrics as needed
  },
},
```

### Viewing Reports

After each CI run, you can download the Lighthouse HTML report from the "Artifacts" section of the workflow run. The report includes detailed metrics, suggestions, and opportunities for improvement.

## Security Scanning

This project includes automated security scanning to catch vulnerabilities early in development and prevent critical issues from reaching production.

### What's Included

- **Snyk Integration**: Scans all dependencies (direct and transitive) for known vulnerabilities on every PR/push
- **Dependabot**: Automatically creates PRs for patch updates and auto-merges them after successful CI
- **Nightly Monitoring**: Runs daily to detect newly disclosed vulnerabilities in your dependency tree
- **CI Enforcement**: Build fails if critical vulnerabilities are detected (with override options)
- **Security Badge**: Displays current security status on the README

### Configuration

#### 1. Set up Snyk token

1. Create a free account at [snyk.io](https://snyk.io)
2. Get your API token from Settings → API Token
3. Add to GitHub repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add new repository secret: `SNYK_TOKEN` with your token value

#### 2. Configure Dependabot reviewers (optional)

Edit `.github/dependabot.yml` to set the `reviewers` and `assignees` fields to your team members or GitHub usernames.

#### 3. Auto-merge patch updates (enabled by default)

The Dependabot configuration includes auto-merge for patch updates. This means:
- Patch version updates (e.g., 1.2.3 → 1.2.4) automatically create PRs
- After CI passes (including security scans), the PR auto-merges
- Bumps your dependencies without manual intervention

### How It Works

#### On Pull Requests and Pushes

The `Security` workflow runs Snyk with the following logic:

1. **Scan dependencies** using Snyk CLI
2. **Fail if critical vulnerabilities** are found (severity threshold: critical)
3. **Allow overrides** (not recommended):
   - Add `[skip security]` to PR title, OR
   - Add `security-override` label to PR
4. **Post detailed findings** to PR comments and step summary
5. **Upload reports** as artifacts (JSON and HTML) for 30 days

#### Nightly Monitoring

The `snyk-monitor` job runs every night at midnight UTC (`cron: '0 0 * * *'`):

- Runs `snyk monitor --all-projects` to create a snapshot of your project's dependencies
- Snyk continuously monitors these snapshots and alerts you (via email/dashboard) when new vulnerabilities are disclosed
- Helps you stay ahead of zero-day issues in your dependencies

### Override Mechanism

Critical vulnerabilities normally fail the CI. To force a build to pass despite critical issues:

- **For PRs**: Add `[skip security]` to the PR title OR add the `security-override` label
- **For direct pushes to main**: You can temporarily disable the workflow protection in GitHub branch protection rules (not recommended)

> ⚠️ **Warning**: Overriding security checks should be extremely rare and only after careful review. Document why you overrode and create a follow-up task to address the vulnerability.

### Viewing Security Reports

After any workflow run:

1. Go to the Actions tab → select the "Security" workflow run
2. In the "Snyk Security Scan" job:
   - **Step summary** shows counts of vulnerabilities by severity
   - **Artifacts** section contains:
     - `snyk-report.json`: Machine-readable report
     - `snyk-report.html`: Human-readable detailed report (open in browser)

### Customizing Security Thresholds

To change which severity levels cause CI to fail:

Edit `.github/workflows/security.yml`:

```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  with:
    args: >
      --severity-threshold=high  # Change from 'critical' to 'high', 'medium', or 'low'
      --fail-on=critical         # Build fails on this severity
```

Or run Snyk locally with:

```bash
npx snyk test --severity-threshold=high
```

### Local Testing

Before pushing, test your dependencies locally:

```bash
# Install Snyk CLI globally (once)
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project (creates snapshot in Snyk dashboard)
snyk monitor
```

### Snyk Dashboard

Visit your Snyk dashboard to:
- See all projects and their vulnerability status
- Set up notifications (Slack, email, etc.) for new vulnerabilities
- Get fix PRs automatically (Snyk can open PRs directly)
- Track remediation progress

### Security Best Practices

- **Never ignore critical vulnerabilities** without a valid override and mitigation plan
- **Upgrade dependencies regularly** - even without known vulns, old packages become unsupported
- **Monitor your Snyk dashboard** daily for new alerts from nightly monitors
- **Review Dependabot PRs** promptly - they include security fixes
- **Consider enabling auto-merge** only for patch updates; minor/major updates should be reviewed
- **Keep SNYK_TOKEN secure** - it's a secret with write access to your Snyk account

### Troubleshooting

**Snyk test fails with "authentication required"**

- Verify `SNYK_TOKEN` secret exists in GitHub repository settings
- Ensure the token has not expired (regenerate if needed)

**No vulnerabilities found but I know there are issues**

- Snyk database may not have caught up - try again later
- Ensure you're using the latest Snyk CLI (the action uses latest by default)
- Check that your `package-lock.json` is committed (Snyk uses lockfile for accurate graph)

**Workflow runs but doesn't fail on critical vulns**

- Verify `--severity-threshold=critical` and `--fail-on=critical` are set
- Check the step output for "Critical vulnerabilities found"
- Ensure there are actually critical vulnerabilities (some may be high, not critical)

**Snyk monitor fails**

- Monitor jobs can fail without breaking the build (continue-on-error: true)
- Check Snyk dashboard to see if the project snapshot was created
- Ensure `SNYK_TOKEN` has monitor permissions

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Check the documentation
- Search existing issues
- Create a new issue with detailed information

## Disclaimer

This boilerplate is provided as-is for rapid MVP development. Always review and test code before production deployment. Security best practices and compliance with your local regulations are your responsibility.