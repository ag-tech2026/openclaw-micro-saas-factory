/**
 * Global type declarations for Next.js App Router
 */

declare global {
  interface Window {
    plausible?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export {};