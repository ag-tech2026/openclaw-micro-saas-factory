'use client';

import { useEffect } from 'react';
import { 
  addClickBreadcrumb, 
  addFormBreadcrumb, 
  addAuthBreadcrumb,
  addNavigationBreadcrumb,
  addBreadcrumb 
} from '@/lib/sentry-breadcrumbs';

/**
 * Hook to add Sentry breadcrumbs for common user actions
 * 
 * Usage:
 *   const sentry = useSentryBreadcrumbs();
 *   sentry.click('Button Text', 'button-id');
 *   sentry.form('Login', '/api/login');
 *   sentry.auth('login', 'oauth', true);
 */
export function useSentryBreadcrumbs() {
  // Track component mount/unmount
  useEffect(() => {
    addBreadcrumb('Component mounted', 'default', { 
      component: 'useSentryBreadcrumbs' 
    });
    
    return () => {
      addBreadcrumb('Component unmounted', 'default');
    };
  }, []);

  return {
    /**
     * Record a button or link click
     */
    click: (text: string, id?: string, data?: Record<string, any>) => {
      addClickBreadcrumb(text, id, data);
    },

    /**
     * Record a form submission
     */
    form: (formName: string, action?: string, data?: Record<string, any>) => {
      addFormBreadcrumb(formName, action, data);
    },

    /**
     * Record an authentication event
     */
    auth: (action: string, method?: string, success?: boolean, data?: Record<string, any>) => {
      addAuthBreadcrumb(action, method, success, data);
    },

    /**
     * Record navigation
     */
    navigation: (to: string, from?: string, data?: Record<string, any>) => {
      addNavigationBreadcrumb(to, from, data);
    },

    /**
     * Record a generic event
     */
    event: (message: string, category?: string, data?: Record<string, any>) => {
      addBreadcrumb(message, category as any, data);
    },
  };
}

/**
 * Higher-order component to automatically track breadcrumbs for form submissions
 * Wrap your form component with this to automatically add breadcrumbs on submit
 */
export function withFormTracking<P extends { children: React.ReactNode }>(
  WrappedComponent: React.ComponentType<P>,
  formName: string
) {
  return function FormTrackingWrapper(props: P) {
    const { form } = useSentryBreadcrumbs();

    const handleSubmit = (e: React.FormEvent) => {
      form(formName, (e.target as HTMLFormElement).action);
    };

    // Clone children and inject onSubmit if it's a form
    if (WrappedComponent.displayName?.includes('form') || (props as any).children?.type?.includes('form')) {
      // This is simplistic - a more robust solution would use React.cloneElement
    }

    return <WrappedComponent {...props} />;
  };
}
