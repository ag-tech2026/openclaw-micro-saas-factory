import * as Sentry from '@sentry/nextjs';
import { isErrorMonitoringEnabled } from './config';

/**
 * Breadcrumb categories
 */
export const BreadcrumbCategory = {
  UI_CLICK: 'ui.click' as const,
  NAVIGATION: 'navigation' as const,
  HTTP: 'http' as const,
  FORM: 'form' as const,
  AUTH: 'auth' as const,
  DEFAULT: 'default' as const,
} as const;

/**
 * Add a breadcrumb to Sentry (client-side)
 */
export function addBreadcrumb(
  message: string,
  category: keyof typeof BreadcrumbCategory = 'default',
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  if (!isErrorMonitoringEnabled()) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: new Date(),
  });
}

/**
 * Breadcrumb for button clicks
 */
export function addClickBreadcrumb(buttonText: string, buttonId?: string, additionalData?: Record<string, any>) {
  addBreadcrumb(
    `User clicked: ${buttonText}`,
    BreadcrumbCategory.UI_CLICK,
    {
      buttonId,
      ...additionalData,
    }
  );
}

/**
 * Breadcrumb for navigation events
 */
export function addNavigationBreadcrumb(to: string, from?: string, additionalData?: Record<string, any>) {
  addBreadcrumb(
    `Navigation: ${to}`,
    BreadcrumbCategory.NAVIGATION,
    {
      to,
      from,
      ...additionalData,
    }
  );
}

/**
 * Breadcrumb for API calls
 */
export function addApiBreadcrumb(
  method: string,
  url: string,
  statusCode?: number,
  responseTime?: number,
  additionalData?: Record<string, any>
) {
  const level: Sentry.SeverityLevel = statusCode && statusCode >= 400 ? 'warning' : 'info';
  
  addBreadcrumb(
    `${method} ${url}`,
    BreadcrumbCategory.HTTP,
    {
      url,
      method,
      statusCode,
      responseTimeMs: responseTime,
      ...additionalData,
    },
    level
  );
}

/**
 * Breadcrumb for form submissions
 */
export function addFormBreadcrumb(formName: string, action?: string, additionalData?: Record<string, any>) {
  addBreadcrumb(
    `Form submitted: ${formName}`,
    BreadcrumbCategory.FORM,
    {
      formName,
      action,
      ...additionalData,
    }
  );
}

/**
 * Breadcrumb for authentication events
 */
export function addAuthBreadcrumb(action: string, method?: string, success?: boolean, additionalData?: Record<string, any>) {
  addBreadcrumb(
    `Auth: ${action}`,
    BreadcrumbCategory.AUTH,
    {
      method,
      success,
      ...additionalData,
    },
    success === false ? 'error' : 'info'
  );
}

/**
 * Set up global event listeners for automatic breadcrumbs
 */
export function setupAutomaticBreadcrumbs() {
  if (typeof window === 'undefined' || !isErrorMonitoringEnabled()) return;

  // Click tracking (for buttons and links)
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    
    if (tagName === 'button' || tagName === 'a') {
      const text = target.textContent?.trim().slice(0, 50) || target.getAttribute('aria-label') || '';
      const id = target.id || target.getAttribute('data-testid') || undefined;
      
      if (text) {
        addClickBreadcrumb(text, id);
      }
    }
  }, { capture: true });

  // Track route changes (for Next.js router)
  // Note: Next.js App Router uses useRouter, but we can also track window location changes
  let lastUrl = typeof window !== 'undefined' ? window.location.href : '';
  window.addEventListener('popstate', () => {
    const currentUrl = window.location.href;
    addNavigationBreadcrumb(currentUrl, lastUrl);
    lastUrl = currentUrl;
  });

  // Track fetch/XHR requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const startTime = Date.now();
    const url = args[0] as string;
    const options = args[1] as RequestInit;
    const method = options?.method || 'GET';

    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;
      
      addApiBreadcrumb(
        method,
        url,
        response.status,
        duration,
        {
          responseOk: response.ok,
        }
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      addApiBreadcrumb(
        method,
        url,
        undefined,
        duration,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  };

  // Track unhandled rejections as breadcrumbs
  window.addEventListener('unhandledrejection', (event) => {
    addBreadcrumb(
      'Unhandled Promise Rejection',
      'default',
      {
        reason: event.reason,
      },
      'error'
    );
  });

  console.log('Automatic Sentry breadcrumbs initialized');
}
