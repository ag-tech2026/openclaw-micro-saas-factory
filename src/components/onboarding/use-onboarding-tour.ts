'use client';

import { useTour } from './tour-context';

/**
 * Hook for controlling the onboarding tour.
 * Provides functions to start/reset the tour and state flags.
 *
 * Must be used within a component wrapped by <OnboardingTour>.
 *
 * @returns Tour control functions and state
 */
export function useOnboardingTour() {
  return useTour();
}

/**
 * Utility to check if a tour has been completed (without needing context)
 */
export function isTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`onboarding-tour-${tourId}-completed`) === 'true';
}

/**
 * Utility to mark a tour as completed manually
 */
export function completeTour(tourId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`onboarding-tour-${tourId}-completed`, 'true');
  }
}

/**
 * Utility to reset tour completion status
 */
export function resetTour(tourId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`onboarding-tour-${tourId}-completed`);
  }
}
