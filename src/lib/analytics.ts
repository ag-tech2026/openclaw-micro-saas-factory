import { isAnalyticsEnabled } from './config';

/**
 * Analytics configuration and utilities
 * Supports Plausible Analytics (privacy-friendly)
 */
class Analytics {
  private enabled: boolean;
  private plausibleDomain: string | undefined;
  private plausibleApiHost: string;

  constructor() {
    this.enabled = isAnalyticsEnabled();
    this.plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    this.plausibleApiHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io';
  }

  /**
   * Track a page view
   * Should be called on page navigation in client-side routing
   */
  trackPageview(url: string, title?: string) {
    if (!this.enabled || !this.plausibleDomain) return;
    this.sendEvent('pageview', {
      url,
      title: title || document.title,
    });
  }

  /**
   * Track a custom event (e.g., button clicks, conversions)
   * @param name - Event name (lowercase, hyphens recommended)
   * @param data - Optional event data (props)
   */
  trackEvent(name: string, data?: Record<string, any>) {
    if (!this.enabled || !this.plausibleDomain) return;
    this.sendEvent('event', {
      name,
      ...data,
    });
  }

  /**
   * Send event to Plausible
   */
  private sendEvent(type: 'pageview' | 'event', payload: Record<string, any>) {
    if (typeof window === 'undefined') return;

    const event = new Event('plausible', {
      bubbles: true,
      cancelable: true,
    });

    // @ts-ignore - Plausible will pick up these properties
    event.customDomain = this.plausibleDomain;
    // @ts-ignore
    event.api = this.plausibleApiHost;

    Object.assign(event, payload);
    window.dispatchEvent(event);
  }

  /**
   * Manual HTTP-based tracking (alternative to script injection)
   * Useful for server-side or when script is not loaded
   */
  async sendManualEvent(type: 'pageview' | 'event', payload: Record<string, any>) {
    if (!this.enabled || !this.plausibleDomain) return;

    try {
      const params = new URLSearchParams({
        ...payload,
        domain: this.plausibleDomain,
        name: type === 'event' ? payload.name : undefined,
      });

      await fetch(`${this.plausibleApiHost}/api/event`, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const analytics = new Analytics();

/**
 * Hook for React components to track events
 */
export function useAnalytics() {
  return {
    trackPageview: (url: string, title?: string) =>
      analytics.trackPageview(url, title),
    trackEvent: (name: string, data?: Record<string, any>) =>
      analytics.trackEvent(name, data),
    isEnabled: analytics.isEnabled(),
  };
}