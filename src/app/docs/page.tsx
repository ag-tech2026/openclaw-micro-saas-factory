'use client';

import { useEffect, useRef } from 'react';

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Redoc from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js';
    script.async = true;
    script.onload = () => {
      if (window.Redoc && containerRef.current) {
        window.Redoc.init('/openapi.yaml', {
          // Redoc options
          scrollYOffset: 50,
          theme: {
            colors: {
              primary: {
                main: '#2563eb',
              },
            },
          },
          // Show examples
          showExamples: true,
          // Expand responses by default
          expandResponses: 'all',
        }, containerRef.current);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            OpenClaw API Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Interactive API reference for OpenClaw&apos;s micro-SaaS factory.
          </p>
        </div>
        <div ref={containerRef} id="redoc-container" />
      </div>
    </div>
  );
}
