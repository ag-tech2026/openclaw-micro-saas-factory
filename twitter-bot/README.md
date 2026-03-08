# Twitter Audience-Building Bot

A comprehensive Node.js/TypeScript bot for building and engaging with a Twitter audience. The bot auto-posts MVP announcements, follows/engages with target users based on keywords, retweets relevant content, and uses an intelligent queue system to stay within rate limits.

## Features

- **Auto-posting**: Schedule and auto-post MVP announcements with hashtags and links
- **Smart Engagement**: Automatically engage with tweets containing target keywords (AI vision, SaaS, etc.)
- **Retweet & Like**: Intelligent retweeting and liking based on relevance
- **User Following**: Follow relevant users to build your audience
- **Rate-Limited Queue**: Built-in rate limit management to stay within Twitter API limits
- **Persistent Queue**: JSON-based queue system for reliable scheduling
- **Daily Limits**: Configurable daily limits for engagements and follows
- **Dry Run Mode**: Test without actually posting
- **Structured Logging**: Winston-based logging with file output
- **State Persistence**: Remembers followed users and processed tweets

## Prerequisites

- Node.js 18+
- Twitter API v2 access (Bearer token and application keys)
- Redis (optional, for production queue management)

## Installation

```bash
# Clone or navigate to the twitter-bot directory
cd twitter-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Configuration

Edit the `.env` file with your Twitter API credentials and bot settings:

```env
# Twitter API v2 Credentials (required)
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_token_secret
TWITTER_USER_ID=your_twitter_user_id

# Queue Configuration
QUEUE_TYPE=memory  # Options: memory, redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Bot Settings
BOT_ENABLED=true
DRY_RUN=false  # Set to true for testing
POST_INTERVAL_MINUTES=30
MAX_DAILY_ENGAGEMENTS=50
MAX_DAILY_FOLLOWS=25

# Keywords for engagement (comma-separated)
ENGAGEMENT_KEYWORDS=AI vision,computer vision,machine learning,SaaS,startup,artificial intelligence

# Phrases to exclude (comma-separated)
EXCLUDE_PHRASES=spam,bot,follow back

# Queue file path
QUEUE_FILE_PATH=./data/posts-queue.json

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/bot.log
```

### Getting Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project and app
3. Enable the following API v2 endpoints:
   - Tweets: Read and Write
   - Users: Follow, Read
4. Generate your API keys, secrets, and access tokens
5. Copy the keys into your `.env` file

## Usage

### Development Mode

```bash
npm run dev
```

This uses `ts-node` for direct TypeScript execution.

### Production Mode

```bash
# Build the project
npm run build

# Run the compiled JavaScript
npm start
```

### Customizing MVP Announcements

Edit the `src/index.ts` file to change the default announcements, or manually add posts to the queue JSON file:

```json
{
  "posts": [
    {
      "id": "unique-id",
      "content": "Your announcement text",
      "hashtags": ["Tag1", "Tag2"],
      "link": "https://your-link.com",
      "scheduledAt": "2026-03-08T02:00:00.000Z",
      "posted": false
    }
  ]
}
```

## Architecture

```
src/
├── index.ts              # Main entry point and bot loop
├── config.ts             # Configuration loading and validation
├── types.ts              # TypeScript interfaces
├── logger.ts             # Winston logger setup
├── twitter.ts            # Twitter API client wrapper
├── queue.ts              # Queue management (Bull + Redis/Memory)
├── engagement.ts         # Engagement engine (search, retweet, like, follow)
└── mvp-announcer.ts      # Post scheduling and publishing
```

### Key Components

**TwitterClient**: Wraps Twitter API v2 with rate limit checking and error handling.

**QueueManager**: Manages the post and engagement queues with persistent storage.

**EngagementEngine**: Handles searching tweets, retweeting, liking, and following based on keywords.

**MvpAnnouncer**: Schedules and publishes MVP announcements from the queue.

## Rate Limits

The bot is designed to respect Twitter API v2 rate limits:

- **Tweets**: 300 per 3 hours (App-only auth)
- **Retweets/Likes**: 288,000 per day
- **Follows**: 400 per day (recommended)
- **Search**: 450 per 15 minutes

The bot enforces:
- Configurable daily engagement limits
- Configurable daily follow limits
- Rate limit checks before each operation
- Automatic rate limit management (can be enhanced with Redis-based counters)

## Monitoring

Check the logs for bot activity:

```bash
tail -f logs/bot.log
```

Key log events:
- Post scheduling and publication
- Engagement actions (retweet, like, follow)
- Rate limit warnings
- Queue statistics
- Error messages

### Queue Stats

The bot outputs stats every 5 minutes:
- Pending posts count
- Engagements used today
- Follows used today

## Dry Run Mode

For testing, set `DRY_RUN=true` in `.env`. The bot will:
- Log actions without actually posting
- Simulate successful posts
- Show what would be enqueued for engagement

Perfect for testing keyword matching, queue behavior, and configuration.

## Troubleshooting

### Authentication Errors
- Verify all TWITTER_* credentials are correct
- Ensure your app has **Read and Write** permissions
- Check that the access token has **OAuth 2.0 PKCE** or **OAuth 1.0a** enabled

### Rate Limit Errors
- Reduce `POST_INTERVAL_MINUTES` to post less frequently
- Lower `MAX_DAILY_ENGAGEMENTS` and `MAX_DAILY_FOLLOWS`
- Check the logs for rate limit warnings

### Queue Not Persisting
- Ensure `./data/` directory is writable
- Check file permissions on `posts-queue.json`
- Verify `QUEUE_FILE_PATH` is correct

### Redis Connection Issues
- Ensure Redis is running: `redis-server`
- Check `REDIS_HOST` and `REDIS_PORT` are correct
- For development, use `QUEUE_TYPE=memory`

## Advanced Configuration

### Custom Keywords

Modify `ENGAGEMENT_KEYWORDS` in `.env` to target specific conversations:

```
ENGAGEMENT_KEYWORDS=computer vision,object detection,image recognition,AI startup,SaaS growth
```

### Geographic Targeting

Set `TARGET_LOCATIONS` with Twitter place IDs to target specific regions:

```
TARGET_LOCATIONS=01a9a39529b27f36,1f7090c68f2c6c06
```

Find place IDs using Twitter's geo API or tools like [Geonames](http://www.geonames.org/).

## Production Deployment

For production use:

1. **Use Redis** (`QUEUE_TYPE=redis`) for persistent queue and rate limit tracking
2. **Set proper logging** with `LOG_LEVEL=info` or `warn`
3. **Configure log rotation** for `bot.log`
4. **Use process manager** like PM2 or systemd
5. **Monitor rate limits** and adjust settings
6. **Set up alerts** for error logs
5. **Secure credentials** - never commit `.env` to version control

### PM2 Example

```bash
npm install -g pm2
pm2 start dist/index.js --name twitter-bot
pm2 save
pm2 startup
```

## Security

- Never commit `.env` to version control
- Rotate API keys regularly
- Use environment variables or a secrets manager
- Enable 2FA on the Twitter developer account
- Monitor logs for unusual activity

## Contributing

This bot is self-contained. To extend:

1. Add new engagement strategies in `engagement.ts`
2. Create custom post templates in `mvp-announcer.ts`
3. Extend queue types in `queue.ts` for different backends
4. Add analytics tracking in `logger.ts`

## License

MIT

## Support

For issues with:
- **Twitter API**: Check [Twitter Developer Docs](https://developer.twitter.com/en/docs)
- **Bot functionality**: Check logs in `./logs/bot.log`
- **Rate limits**: Verify your app's rate limits in the Developer Portal

---

✅ Built with Node.js, TypeScript, twitter-api-v2, Bull, and Winston.
