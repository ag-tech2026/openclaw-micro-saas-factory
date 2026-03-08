import Link from 'next/link';
import { LandingPageConfig } from '@/lib/landing-config';

interface HeroProps {
  config: LandingPageConfig;
}

export default function Hero({ config }: HeroProps) {
  const { hero, name, tagline, description } = config;

  const headline = hero.headline || tagline || name;
  const subheadline = hero.subheadline || description;

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
            <span className="block">{headline}</span>
          </h1>

          {/* Subheadline */}
          {subheadline && (
            <p className="mt-6 text-lg sm:text-xl leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {subheadline}
            </p>
          )}

          {/* CTA buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6 flex-wrap">
            <Link
              href={hero.ctaUrl || '#signup'}
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              {hero.ctaText || 'Get Started'}
            </Link>
            <a
              href="#features"
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Optional: Feature highlights */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">10x</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Productivity Boost</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Support Available</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
