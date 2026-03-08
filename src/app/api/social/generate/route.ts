import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';
import { socialMediaGenerator } from '@/lib/social-media-generator';
import { requireSubscription } from '@/lib/auth-utils';

/**
 * POST /api/social/generate
 *
 * Manually trigger social media content generation for an MVP.
 * This endpoint can be called when a new MVP config is added.
 *
 * Also supports listing existing generated assets via GET.
 */
export async function POST(request: NextRequest) {
  try {
    // Require active subscription
    const user = await requireSubscription(request);
    // user is available if needed for logging/auditing

    const body = await request.json();
    const { slug, triggerEvent = true } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Check if assets already exist
    const existing = socialMediaGenerator.loadAssets(slug);
    if (existing) {
      return NextResponse.json({
        message: 'Assets already exist for this MVP',
        assets: existing,
      });
    }

    // Option 1: Call the Inngest function directly for async processing
    if (triggerEvent) {
      const result = await inngest.send({
        name: 'mvp/social.media.generation.requested',
        data: { slug },
      });

      return NextResponse.json({
        message: 'Social media generation queued',
        slug,
        eventId: result.id,
      });
    }

    // Option 2: Generate synchronously (for testing)
    const { loadLandingConfig } = await import('@/lib/landing-config');
    const config = await loadLandingConfig(slug);
    const assets = await socialMediaGenerator.generateForMvp(config);

    return NextResponse.json({
      message: 'Social media assets generated successfully',
      assets,
    });
  } catch (error: any) {
    console.error('Social media generation failed:', error);

    return NextResponse.json(
      {
        error: 'Generation failed',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/generate
 *
 * List all generated social media assets.
 */
export async function GET() {
  try {
    const assets = socialMediaGenerator.listGenerated();

    return NextResponse.json({
      count: assets.length,
      assets,
    });
  } catch (error: any) {
    console.error('Failed to list assets:', error);

    return NextResponse.json(
      {
        error: 'Failed to list assets',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
