import { NextRequest, NextResponse } from 'next/server';
import { socialMediaGenerator } from '@/lib/social-media-generator';

/**
 * GET /api/social/assets/[slug]
 *
 * Get generated social media assets for a specific MVP.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const assets = socialMediaGenerator.loadAssets(slug);

    if (!assets) {
      return NextResponse.json(
        { error: 'No assets found for this MVP' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      slug,
      assets,
    });
  } catch (error: any) {
    console.error('Failed to fetch assets:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch assets',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/assets/[slug]
 *
 * Update a post's content or status (e.g., edit caption before scheduling).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { platform, content, hashtags, scheduledAt } = body;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    const assets = socialMediaGenerator.loadAssets(slug);
    if (!assets) {
      return NextResponse.json(
        { error: 'No assets found for this MVP' },
        { status: 404 }
      );
    }

    const post = assets.posts.find(p => p.platform === platform);
    if (!post) {
      return NextResponse.json(
        { error: `No ${platform} post found` },
        { status: 404 }
      );
    }

    // Update post content if provided
    if (content !== undefined) {
      post.content = content;
    }
    if (hashtags !== undefined) {
      post.hashtags = hashtags;
    }
    if (scheduledAt !== undefined) {
      post.scheduledAt = new Date(scheduledAt);
    }

    // Save changes
    socialMediaGenerator.updatePostStatus(slug, platform, post.status);

    return NextResponse.json({
      message: 'Post updated successfully',
      post,
    });
  } catch (error: any) {
    console.error('Failed to update post:', error);

    return NextResponse.json(
      {
        error: 'Failed to update post',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/assets/[slug]/schedule
 *
 * Schedule a post for publishing.
 */
export async function POST_SCHEDULE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { platform, delayMinutes = 0 } = body;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    const assets = socialMediaGenerator.loadAssets(slug);
    if (!assets) {
      return NextResponse.json(
        { error: 'No assets found for this MVP' },
        { status: 404 }
      );
    }

    const post = assets.posts.find(p => p.platform === platform);
    if (!post) {
      return NextResponse.json(
        { error: `No ${platform} post found` },
        { status: 404 }
      );
    }

    // Schedule the post via Inngest
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    const result = await inngest.send({
      name: 'social/post.scheduled',
      data: {
        slug,
        platform,
        postId: `${slug}-${platform}-${Date.now()}`,
        scheduledAt: scheduledAt.toISOString(),
      },
    });

    // Update status to scheduled
    socialMediaGenerator.updatePostStatus(slug, platform, 'scheduled', result.id);

    return NextResponse.json({
      message: 'Post scheduled successfully',
      jobId: result.id,
      scheduledAt,
    });
  } catch (error: any) {
    console.error('Failed to schedule post:', error);

    return NextResponse.json(
      {
        error: 'Failed to schedule post',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
