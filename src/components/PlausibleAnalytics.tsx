'use client';

import { useEffect } from 'react';
import { isAnalyticsEnabled } from '@/lib/config';

/**
 * Plausible Analytics Script Component
 * Injects the Plausible tracking script when analytics is enabled
 */
export default function PlausibleAnalytics() {
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    if (!domain) return;

    // Create script element
    const script = document.createElement('script');
    script.defer = true;
    script.src = `https://${domain}/js/script.js`;
    script.setAttribute('data-api', process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io');
    script.setAttribute('data-domain', domain);
    script.setAttribute('id', 'plausible');

    // Insert before first script tag
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}