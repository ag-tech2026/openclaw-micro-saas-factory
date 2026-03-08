# Next.js MVP Boilerplate

[![Accessibility Tests](https://github.com/your-username/your-repo/actions/workflows/a11y.yml/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/a11y.yml)

A production-ready Next.js 15 boilerplate with environment configuration, error monitoring, analytics, and comprehensive documentation for rapid MVP deployment.

**🚀 Deployed via Vercel with automatic CI/CD**

## Features

- **Environment Configuration**: Type-safe env var loading with Zod validation and clear error messages
- **Error Monitoring**: Sentry integration with global error boundaries for client and server-side errors
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

## Security Notes

- Never commit `.env.local` or any files containing secrets
- Rotate API keys regularly
- Use webhook signatures for payment integrations
- Enable CORS properly for API routes

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