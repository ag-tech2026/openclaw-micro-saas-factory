'use client';

import { useState, useEffect } from 'react';
import { LandingPageConfig } from '@/lib/landing-config';
import { authClient } from '@/lib/auth-client';

interface PricingProps {
  config: LandingPageConfig;
}

export default function Pricing({ config }: PricingProps) {
  const { pricing } = config;

  if (!pricing.enabled || pricing.plans.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pricing.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Check if Polar integration is enabled globally
  const usePolar = pricing.polarEnabled && !!pricing.polarProductId;

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is signed in
    authClient.getSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoadingSession(false);
    });
  }, []);

  const handleCheckout = async (plan: any) => {
    // If Polar not configured for this plan, fallback
    if (!usePolar || !plan.polarPlanId) {
      // For free plan, just show get started; for paid without polar, maybe email signup
      if (plan.price === 0) {
        window.location.href = '#get-started';
      } else {
        alert('Payment integration not configured for this plan.');
      }
      return;
    }

    // Ensure user is authenticated
    if (!user) {
      // Redirect to sign-in with callback
      const callbackUrl = window.location.pathname + window.location.search;
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return;
    }

    setProcessingPlan(plan.name);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: pricing.polarProductId, // product from pricing config
          planId: plan.polarPlanId, // plan-specific ID
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      // Redirect to Polar checkout
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
      setProcessingPlan(null);
    }
  };

  if (loadingSession) {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Choose the plan that&apos;s right for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricing.plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h3
                className={`text-xl font-semibold ${
                  plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}
              >
                {plan.name}
              </h3>

              <div className="mt-4 flex items-baseline">
                <span
                  className={`text-4xl font-bold ${
                    plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {formatPrice(plan.price)}
                </span>
                <span
                  className={`ml-2 ${
                    plan.highlighted ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              {plan.description && (
                <p
                  className={`mt-4 text-sm ${
                    plan.highlighted
                      ? 'text-blue-100'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {plan.description}
                </p>
              )}

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <span
                      className={`flex-shrink-0 ${
                        plan.highlighted ? 'text-blue-200' : 'text-green-500'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`ml-3 text-sm ${
                        plan.highlighted
                          ? 'text-blue-50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={processingPlan === plan.name}
                  className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-gray-50 disabled:bg-gray-100'
                      : plan.price === 0
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 disabled:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-400'
                  }`}
                >
                  {processingPlan === plan.name ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4\" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    plan.ctaText
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Polar integration notice */}
        {usePolar && (
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Payments powered by{' '}
              <a
                href="https://polar.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Polar
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
