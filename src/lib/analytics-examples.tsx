/**
 * Analytics Usage Examples
 * This file demonstrates how to use the analytics utilities throughout your app
 */

import { useAnalytics } from '@/lib/analytics';
import { analytics } from '@/lib/analytics';

// ============================================
// Client-Side Examples (React Components)
// ============================================

/**
 * Example 1: Basic pageview tracking
 * In your page components, the page view is automatically tracked
 * when you use the useAnalytics hook
 */
export function TrackedPage() {
  const { trackEvent, isEnabled } = useAnalytics();

  useEffect(() => {
    if (isEnabled()) {
      trackEvent('page_view', {
        path: window.location.pathname,
        title: document.title,
      });
    }
  }, [trackEvent, isEnabled]);

  return <div>Page content</div>;
}

/**
 * Example 2: Button click tracking for conversions
 */
export function ConversionButton() {
  const { trackEvent } = useAnalytics();

  const handleSignup = () => {
    trackEvent('conversion', {
      type: 'signup',
      method: 'email',
      // Add custom properties as needed
      plan: 'pro',
      source: 'landing_page',
    });
  };

  return (
    <button onClick={handleSignup} className="btn-primary">
      Sign Up Now
    </button>
  );
}

/**
 * Example 3: Tracking multiple interactions
 */
export function FeatureTour() {
  const { trackEvent } = useAnalytics();

  const trackStep = (step: number) => {
    trackEvent('tour_progress', {
      step,
      tour_name: 'onboarding',
    });
  };

  const handleNext = () => {
    // Track and advance
    trackStep(2);
  };

  return (
    <div>
      <h2>Feature Tour</h2>
      <button onClick={handleNext}>Next Step</button>
    </div>
  );
}

// ============================================
// Server-Side Examples (API Routes, Actions)
// ============================================

/**
 * Example 4: Tracking from an API route
 */
export async function POST(request: Request) {
  const { analytics } = require('@/lib/analytics');

  try {
    const data = await request.json();

    // Process the request...

    // Track conversion event
    await analytics.sendManualEvent('conversion', {
      name: 'purchase',
      amount: data.amount,
      product_id: data.productId,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * Example 5: Server Action with analytics
 */
export async function createOrder(formData: FormData) {
  'use server';

  const { analytics } = require('@/lib/analytics');

  const order = await processOrder(formData);

  // Track purchase
  await analytics.sendManualEvent('purchase', {
    order_id: order.id,
    total: order.total,
    items: order.items.length,
    currency: 'USD',
  });

  return order;
}

// ============================================
// Custom Event Definitions
// ============================================

/**
 * Recommended event names for common actions
 * Use lowercase with underscores or hyphens
 */
export const EVENT_NAMES = {
  // Page views
  PAGE_VIEW: 'page_view',

  // User engagement
  BUTTON_CLICK: 'button_click',
  LINK_CLICK: 'link_click',
  FORM_SUBMIT: 'form_submit',
  SEARCH: 'search',

  // Conversions
  SIGN_UP: 'signup',
  LOGIN: 'login',
  PURCHASE: 'purchase',
  SUBSCRIPTION: 'subscription',
  DOWNLOAD: 'download',
  SHARE: 'share',

  // Content
  VIDEO_PLAY: 'video_play',
  VIDEO_COMPLETE: 'video_complete',
  ARTICLE_READ: 'article_read',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  FORM_ERROR: 'form_error',
} as const;

/**
 * Best Practices:
 *
 * 1. Use descriptive event names (e.g., 'signup_button_click' not just 'click')
 * 2. Add relevant context properties (user role, page, device, etc.)
 * 3. Be consistent with naming conventions across your app
 * 4. Don't track sensitive data (PII, passwords, tokens)
 * 5. Test analytics in development before deploying
 *
 * Example event payload:
 * {
 *   name: 'conversion',
 *   type: 'signup',
 *   method: 'google_oauth',
 *   plan: 'monthly',
 *   source: 'hero_cta'
 * }
 */