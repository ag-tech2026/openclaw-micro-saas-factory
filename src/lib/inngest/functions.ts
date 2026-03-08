import { inngest, EVENTS } from '@/lib/inngest';
import { env } from '@/lib/config';

/**
 * Domain-specific prompt for vision analysis
 * Customize this based on your specific use case
 */
const VISION_ANALYSIS_PROMPT = `Analyze this image and provide a detailed description including:
- Main subjects and their attributes
- Scene composition and setting
- Colors, lighting, and mood
- Any text or symbols visible
- Potential use cases or applications

Be specific and objective. Format as structured JSON with keys:
- summary: brief overview
- details: array of observations
- tags: relevant keywords
- confidence: your confidence level (0-1)`;

/**
 * Error tracking helper
 */
async function trackError(error: Error, context: Record<string, any>) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }
}

/**
 * Background function: Process vision analysis via OpenRouter
 *
 * @param data - Event data containing image URL and analysis parameters
 */
export const processVisionAnalysis = inngest.createFunction(
  {
    id: 'process-vision-analysis',
    name: 'Process Vision Analysis',
    description: 'Analyze an image using OpenRouter vision model',
    // Retry on failure with exponential backoff
    retry: {
      limit: 3,
      minInterval: 1000,
      maxInterval: 60000,
      backoff: 'exponential',
    },
    // Timeout after 5 minutes
    timeout: '5m',
  },
  async ({ event, step }) => {
    const { imageUrl, requestId, prompt = VISION_ANALYSIS_PROMPT } = event.data;

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    try {
      // Step: Fetch the image (with retry)
      const imageBuffer = await step.run('fetch-image', async () => {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        return response.buffer();
      });

      // Step: Call OpenRouter vision API
      const analysisResult = await step.run('call-openrouter', async () => {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Vision Analysis',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o', // or any vision-capable model on OpenRouter
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          throw new Error(`OpenRouter API error: ${openRouterResponse.status} - ${errorText}`);
        }

        return openRouterResponse.json();
      });

      // Extract and format the analysis
      const analysis = analysisResult.choices?.[0]?.message?.content || 'No analysis available';

      // Step: Persist result to database or storage (placeholder)
      // You would integrate with your database here (Prisma, Supabase, etc.)
      await step.run('persist-result', async () => {
        // Example: save to database
        // await db.visionAnalysis.create({
        //   data: {
        //     id: requestId,
        //     imageUrl,
        //     analysis,
        //     completedAt: new Date().toISOString(),
        //   }
        // });

        // For now, we'll just log the completion
        console.log(`Analysis completed for request: ${requestId}`);
        return { persisted: true };
      });

      return {
        success: true,
        requestId,
        analysis,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Log the error
      console.error(`Vision analysis failed for request ${requestId}:`, errorMessage);

      // Could send to error tracking here
      await trackError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        imageUrl,
      });

      // Throw to trigger retry mechanism
      throw error;
    }
  }
);

/**
 * Optional: Separate function for batch processing
 */
export const batchProcessVisionAnalysis = inngest.createFunction(
  {
    id: 'batch-process-vision-analysis',
    name: 'Batch Process Vision Analysis',
    description: 'Process multiple images in a batch',
    retry: {
      limit: 2,
      backoff: 'linear',
    },
  },
  async ({ event, step }) => {
    const { imageUrls, requestId } = event.data;

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('Image URLs array is required');
    }

    const results = await step.parallel(
      'analyze-images',
      imageUrls.map((url, index) =>
        step.run(`analyze-${index}`, async () => {
          // Reuse the single-image logic (could be extracted)
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: VISION_ANALYSIS_PROMPT,
                    },
                    {
                      type: 'image_url',
                      image_url: { url },
                    },
                  ],
                },
              ],
            }),
          });

          const data = await response.json();
          return {
            url,
            analysis: data.choices?.[0]?.message?.content || 'No analysis',
          };
        })
      )
    );

    return {
      success: true,
      requestId,
      totalImages: imageUrls.length,
      results,
      completedAt: new Date().toISOString(),
    };
  }
);

/**
 * Background function: Generate social media content for a new MVP
 *
 * This function is triggered when a new MVP config is added to the system.
 * It generates product mockups and captions for Twitter and LinkedIn.
 */
export const generateSocialMediaForMvp = inngest.createFunction(
  {
    id: 'generate-social-media-for-mvp',
    name: 'Generate Social Media for MVP',
    description: 'Generate images and captions for social media posts when a new MVP is launched',
    retry: {
      limit: 2,
      minInterval: 5000,
      maxInterval: 30000,
      backoff: 'exponential',
    },
    timeout: '10m',
  },
  async ({ event, step }) => {
    const { slug } = event.data;

    if (!slug) {
      throw new Error('MVP slug is required');
    }

    try {
      // Step: Load MVP config
      const config = await step.run('load-mvp-config', async () => {
        const { loadLandingConfig } = await import('@/lib/landing-config');
        return await loadLandingConfig(slug);
      });

      // Step: Generate social media assets
      const assets = await step.run('generate-assets', async () => {
        const { socialMediaGenerator } = await import('@/lib/social-media-generator');
        return await socialMediaGenerator.generateForMvp(config);
      });

      // Step: Check if social media APIs are available and schedule posts if configured
      if (env.TWITTER_API_KEY && env.TWITTER_ACCESS_TOKEN) {
        await step.run('schedule-twitter-post', async () => {
          const twitterPost = assets.posts.find(p => p.platform === 'twitter');
          if (twitterPost) {
            // Queue the Twitter post via the existing bot system
            // This could integrate with the twitter-bot/queue system
            console.log(`Twitter post ready to schedule for ${slug}:`, {
              content: twitterPost.content.substring(0, 100),
              image: twitterPost.imagePath,
            });
            // In a full implementation, we would add to the queue here
            // For now, we mark as draft and let the user schedule via UI
          }
        });
      }

      if (env.LINKEDIN_ACCESS_TOKEN) {
        await step.run('schedule-linkedin-post', async () => {
          const linkedinPost = assets.posts.find(p => p.platform === 'linkedin');
          if (linkedinPost) {
            console.log(`LinkedIn post ready to schedule for ${slug}:`, {
              content: linkedinPost.content.substring(0, 100),
              image: linkedinPost.imagePath,
            });
            // In a full implementation, we would post to LinkedIn API
          }
        });
      }

      return {
        success: true,
        slug,
        assets: {
          imageCount: assets.imagePaths.length,
          posts: assets.posts.map(p => ({ platform: p.platform, status: p.status })),
        },
        generatedAt: assets.generatedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`Social media generation failed for MVP ${slug}:`, errorMessage);

      // Could send to error tracking
      await trackError(error instanceof Error ? error : new Error(String(error)), {
        slug,
        function: 'generateSocialMediaForMvp',
      });

      throw error;
    }
  }
);

/**
 * Background function: Schedule a post to social media
 */
export const scheduleSocialPost = inngest.createFunction(
  {
    id: 'schedule-social-post',
    name: 'Schedule Social Post',
    description: 'Schedule a generated post to be published on a social platform',
    retry: {
      limit: 3,
      minInterval: 2000,
      maxInterval: 60000,
      backoff: 'exponential',
    },
    timeout: '5m',
  },
  async ({ event, step }) => {
    const { slug, platform, postId, scheduledAt } = event.data;

    if (!slug || !platform) {
      throw new Error('Slug and platform are required');
    }

    try {
      // Load the generated assets
      const assets = await step.run('load-assets', async () => {
        const { socialMediaGenerator } = await import('@/lib/social-media-generator');
        const loaded = socialMediaGenerator.loadAssets(slug);
        if (!loaded) {
          throw new Error(`No assets found for slug: ${slug}`);
        }
        return loaded;
      });

      const post = assets.posts.find(p => p.platform === platform);
      if (!post) {
        throw new Error(`No ${platform} post found for ${slug}`);
      }

      // Schedule based on platform
      if (platform === 'twitter' && env.TWITTER_API_KEY) {
        await step.run('post-to-twitter', async () => {
          // Integrate with twitter-bot's queue system
          // This would post immediately or schedule
          console.log(`Posting to Twitter: ${post.content.substring(0, 50)}...`);
          // Implementation: use Twitter API v2
          // For now, simulate success
        });
      } else if (platform === 'linkedin' && env.LINKEDIN_ACCESS_TOKEN) {
        await step.run('post-to-linkedin', async () => {
          console.log(`Posting to LinkedIn: ${post.content.substring(0, 50)}...`);
          // Implementation: use LinkedIn API
        });
      }

      // Update status to posted
      await step.run('update-status', async () => {
        const { socialMediaGenerator } = await import('@/lib/social-media-generator');
        socialMediaGenerator.updatePostStatus(slug, platform, 'posted', postId);
      });

      return {
        success: true,
        slug,
        platform,
        postedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to schedule post for ${slug} on ${platform}:`, errorMessage);
      throw error;
    }
  }
);

