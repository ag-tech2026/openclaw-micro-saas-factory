'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Joyride, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { OnboardingTourConfig, OnboardingStep } from './onboarding-types';
import { TourContext, TourContextValue } from './tour-context';

interface OnboardingTourProviderProps {
  children: React.ReactNode;
  config: OnboardingTourConfig;
}

/**
 * OnboardingTour component wraps react-joyride with enhanced features:
 * - localStorage persistence (completion tracking)
 * - Callback handling (onComplete, onSkip)
 * - Auto-start option for first-time users
 * - Context API for programmatic control (start/reset)
 *
 * Usage:
 * ```tsx
 * <OnboardingTour
 *   config={{
 *     tourId: 'main-app-tour',
 *     steps: [...],
 *     onComplete: () => console.log('Tour completed!'),
 *     autoStartOnMount: true,
 *   }}
 * >
 *   <YourApp />
 * </OnboardingTour>
 * ```
 */
export function OnboardingTour({ children, config }: OnboardingTourProviderProps) {
  const { tourId, steps, onComplete, onSkip, autoStartOnMount } = config;
  const [run, setRun] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Check completion status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(`onboarding-tour-${tourId}-completed`) === 'true';
      setIsCompleted(completed);
    }
  }, [tourId]);

  // Auto-start tour on mount if not completed and autoStart is enabled
  useEffect(() => {
    if (autoStartOnMount && !isCompleted) {
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStartOnMount, isCompleted]);

  // Keep isRunning in sync with run state
  useEffect(() => {
    setIsRunning(run);
  }, [run]);

  // Listen for replay events
  useEffect(() => {
    const handleReplay = (event: CustomEvent<{ tourId: string }>) => {
      if (event.detail.tourId === tourId) {
        localStorage.removeItem(`onboarding-tour-${tourId}-completed`);
        setIsCompleted(false);
        setStepIndex(0);
        setRun(true);
      }
    };

    window.addEventListener('replay-onboarding-tour', handleReplay as EventListener);
    return () => window.removeEventListener('replay-onboarding-tour', handleReplay as EventListener);
  }, [tourId]);

  // Handler for tour callbacks
  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, index } = data;
      const currentStatus = status as string;

      // Update step index
      if (typeof index === 'number') {
        setStepIndex(index);
      }

      // Handle tour events
      if (type === EVENTS.TOUR_END) {
        if (currentStatus.includes(STATUS.FINISHED) || currentStatus.includes(STATUS.SKIP)) {
          const isSkipped = currentStatus.includes(STATUS.SKIP);

          if (isSkipped) {
            onSkip?.();
          } else {
            // Mark as completed only if fully finished (not skipped)
            if (!isSkipped) {
              localStorage.setItem(`onboarding-tour-${tourId}-completed`, 'true');
              setIsCompleted(true);
              onComplete?.();
            }
          }

          setRun(false);
        }
      }
    },
    [tourId, onComplete, onSkip]
  );

  // Context value provided to children
  const contextValue: TourContextValue = {
    start: () => setRun(true),
    reset: () => {
      localStorage.removeItem(`onboarding-tour-${tourId}-completed`);
      setIsCompleted(false);
      setRun(false);
      setStepIndex(0);
    },
    isCompleted,
    isRunning,
  };

  return (
    <TourContext.Provider value={contextValue}>
      <Joyride
        callback={handleCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        stepIndex={stepIndex}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#3b82f6',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            width: 'auto',
            maxWidth: '400px',
            borderRadius: '12px',
            padding: '16px',
          },
          tooltipContainer: {
            padding: '8px',
            textAlign: 'left' as const,
          },
          buttonNext: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
          },
          buttonBack: {
            color: '#6b7280',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
          },
          buttonSkip: {
            color: '#9ca3af',
            fontSize: '12px',
          },
          tooltip: {
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            maxWidth: '350px',
          },
          arrow: {
            width: '12px',
            height: '12px',
          },
        }}
        disableScrollingFix={false}
        disableCloseOnEsc={false}
      >
        {({ isRunning }) => (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Onboarding tour"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: isRunning ? 'auto' : 'none',
              zIndex: 10000,
            }}
          />
        )}
      </Joyride>

      {children}
    </TourContext.Provider>
  );
}

/**
 * Helper component to render a replay button anywhere in the app.
 * This button resets the tour completion status and triggers a restart.
 *
 * Usage:
 * <TourReplayButton tourId="main-app-tour" />
 */
export function TourReplayButton({ tourId, className, id }: { tourId: string; className?: string; id?: string }) {
  const handleReplay = () => {
    localStorage.removeItem(`onboarding-tour-${tourId}-completed`);
    window.dispatchEvent(new CustomEvent('replay-onboarding-tour', { detail: { tourId } }));
  };

  return (
    <button
      id={id}
      onClick={handleReplay}
      className={className ?? "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"}
      aria-label="Replay onboarding tour"
    >
      <span>↻</span>
      <span>Replay Tour</span>
    </button>
  );
}
