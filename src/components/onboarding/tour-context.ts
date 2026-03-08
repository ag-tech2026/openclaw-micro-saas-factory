'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface TourContextValue {
  /** Start the tour */
  start: () => void;
  /** Reset tour completion status and stop if running */
  reset: () => void;
  /** Whether the tour has been completed (persisted) */
  isCompleted: boolean;
  /** Whether the tour is currently running */
  isRunning: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * Hook to access the tour control context.
 * Must be used within a component wrapped by <OnboardingTour>.
 */
export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within an OnboardingTour provider');
  }
  return context;
}

export { TourContext };
