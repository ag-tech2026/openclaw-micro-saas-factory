'use client';

import { useState } from 'react';
import { LandingPageConfig } from '@/lib/landing-config';

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

  // Check if Polar integration is enabled
  const usePolar = pricing.polarEnabled && pricing.polarProductId;

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
                {usePolar ? (
                  // Polar integration placeholder
                  <a
                    href="#polar-checkout"
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:bg-gray-50'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Integrate Polar checkout
                      alert(
                        'Polar checkout would be initialized here. Configure Polar in your product settings.'
                      );
                    }}
                  >
                    {plan.ctaText}
                  </a>
                ) : (
                  <a
                    href={plan.price === 0 ? '#get-started' : '#signup'}
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:bg-gray-50'
                        : plan.price === 0
                        ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {plan.ctaText}
                  </a>
                )}
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
