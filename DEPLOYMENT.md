# Deployment Guide

This guide covers deploying your Next.js MVP boilerplate to various platforms.

## Pre-Deployment Checklist

- [ ] All environment variables configured in `.env.local`
- [ ] `NEXT_PUBLIC_APP_URL` set to your production domain
- [ ] Analytics domain configured (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`)
- [ ] Sentry DSN configured if using error monitoring
- [ ] Run `npm run build` to verify build succeeds
- [ ] Run `npm run lint` to fix any linting issues
- [ ] Test the production build locally with `npm start`

## Vercel (Recommended)

### Best for Next.js apps, automatic deployments, edge functions

1. **Push to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Select "Next.js" as the framework preset

3. **Configure Environment Variables**
   In Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Set for Production and Preview environments

4. **Deploy**
   - Vercel will automatically deploy on push to main
   - Enable "Automatic Deploys" for CI/CD

5. **Custom Domain** (optional)
   - Add domain in Vercel dashboard
   - Update `NEXT_PUBLIC_APP_URL` environment variable

### Vercel Configuration

Create `vercel.json` for customization:

```json
{
  "functions": {
    "src/app/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Netlify

### Best for static exports, form handling, serverless functions

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node.js version: 18+

2. **Environment Variables**
   - Site settings → Build & deploy → Environment
   - Add all environment variables
   - Important: `NEXT_PUBLIC_*` variables are exposed to client

3. **Deploy**
   - Connect repository
   - Trigger deploy manually or via git push

4. **SPA Fallback** (if needed)
   Add `_redirects` file in `/public`:
   ```
   /* /index.html 200
   ```

5. **Custom Domain**
   - Domain settings → Add custom domain
   - Update `NEXT_PUBLIC_APP_URL`

### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Railway

### Best for full-stack apps, managed databases

1. **Connect Repository**
   - Create new project in Railway
   - Connect your Git repository

2. **Add Variables**
   - Variables tab → Add all env vars
   - Set `NODE_ENV=production`

3. **Deploy**
   - Railway auto-deploys on push
   - CLI available for manual deployments

4. **Custom Domain**
   - Settings → Domains → Add Domain
   - Update `NEXT_PUBLIC_APP_URL`

### Railway Configuration

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100
  }
}
```

## Render

### Best for full-stack, managed PostgreSQL, background workers

1. **Create Web Service**
   - New Web Service
   - Connect repository
   - Environment: Node

2. **Environment**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add all environment variables

3. **Deploy**
   - Render builds and deploys automatically
   - Configure auto-deploy on git push

4. **Custom Domain**
   - Settings → Custom Domain → Add
   - Update `NEXT_PUBLIC_APP_URL`

## Docker Deployment

### For containerized environments (Kubernetes, ECS, etc.)

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

`docker build -t myapp . && docker run -p 3000:3000 myapp`

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://yourdomain.com
      - NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
      # ... other env vars
    restart: unless-stopped
```

## AWS Amplify

### Best for serverless Next.js with AWS ecosystem

1. **Connect Repository**
   - Amplify Console → Get started
   - Connect your repo

2. **Build Settings**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Framework: Next.js - SSR

3. **Environment Variables**
   - App settings → Environment variables
   - Add all required variables

4. **Deploy**
   - Automatic deployments on commit
   - Manual deploy available

## Platform-Specific Considerations

### Environment Variables

- **Next.js**: `NEXT_PUBLIC_*` variables are exposed to the browser
- Keep secrets in server-only variables (without `NEXT_PUBLIC_` prefix)
- All variables must be set before the build starts on most platforms

### Sentry Source Maps

For proper error stack traces, upload source maps:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# After build, upload
sentry-cli releases new <release-name>
sentry-cli releases files <release-name> upload-sourcemaps ./build
sentry-cli releases finalize <release-name>
```

Or use the `@sentry/nextjs` build script:

```json
{
  "scripts": {
    "build": "sentry-cli releases new $VERCEL_GIT_COMMIT_SHA && next build && sentry-cli releases files $VERCEL_GIT_COMMIT_SHA upload-sourcemaps ./build && sentry-cli releases finalize $VERCEL_GIT_COMMIT_SHA"
  }
}
```

### Plausible Analytics

- No additional configuration needed beyond `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- Script is automatically injected by the `<PlausibleAnalytics />` component
- Ensure your domain is added in Plausible dashboard

### Edge Runtime

For better performance, enable Edge runtime in your API routes:

```typescript
export const runtime = 'edge';
```

Note: Edge runtime has limitations (no Node.js APIs, limited package support)

## Monitoring After Deployment

### Sentry

1. Check your Sentry dashboard for errors
2. Set up email/Slack notifications for new issues
3. Configure release tracking for better error grouping

### Analytics

1. Open Plausible dashboard
2. Verify pageviews are being recorded
3. Check real-time analytics for test events

### Performance

1. Use Next.js Analytics (built into Vercel) or Lighthouse
2. Monitor Core Web Vitals
3. Set up uptime monitoring (UptimeRobot, Pingdom)

## Rollback Strategy

### Vercel
- Automatic rollback to previous deployment
- Or manually redeploy previous commit

### Other Platforms
- Keep previous Docker image tags
- Use git revert for code changes
- Have a hotfix branch ready

## Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS only
- [ ] Set security headers (use `next-secure-headers`)
- [ ] Rate limiting on API routes
- [ ] CORS properly configured
- [ ] No sensitive data in client-side code
- [ ] Regular dependency updates (`npm audit`)

## Troubleshooting

### Build Fails

```bash
# Clean cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Environment Variables Not Available

- Ensure they are set in the platform's dashboard
- Variables are loaded at build time for most platforms
- Use `NEXT_PUBLIC_*` for client-side access

### Analytics Not Working

- Check `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set correctly
- Verify domain is added in Plausible dashboard
- Check browser console for errors
- Use ad-blocker to test (should not block Plausible)

### Sentry Not Capturing Errors

- Verify `SENTRY_DSN` is correct
- Check `ENABLE_ERROR_MONITORING=true`
- Build with Sentry enabled: `next build`
- Ensure source maps are uploaded

## Zero-Downtime Deploys

Most modern platforms handle this automatically:

- **Vercel**: Instant, zero-downtime deployments
- **Netlify**: Atomic deploys with instant rollback
- **Railway**: Rolling updates
- **Render**: Blue-green deployments

For custom infrastructure:

1. Deploy to a new instance/staging
2. Run health checks
3. Switch traffic (load balancer)
4. Keep old instance for rollback

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Documentation](https://vercel.com/docs)
- [Plausible Analytics Docs](https://plausible.io/docs)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)