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
