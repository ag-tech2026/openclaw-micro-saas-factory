import { Step } from 'react-joyride';

// Extend react-joyride's Step type with any custom properties we might need
export interface OnboardingStep extends Step {
  // Additional custom properties can be added here
  // For example: feature?: 'kanban' | 'tasks' | 'pricing';
}

export interface OnboardingTourConfig {
  /** Unique identifier for the tour (used for localStorage key) */
  tourId: string;
  /** Array of tour steps */
  steps: OnboardingStep[];
  /** Callback when tour is completed (all steps finished) */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
  /** Show the tour automatically on first visit if not completed */
  autoStartOnMount?: boolean;
  /** Callback when tour visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
}

export interface UseOnboardingTourReturn {
  /** Start the tour */
  startTour: () => void;
  /** Reset tour completion status (for replay) */
  resetTourStatus: () => void;
  /** Whether the tour has been completed */
  isCompleted: boolean;
  /** Whether the tour is currently running */
  isTourRunning: boolean;
}
