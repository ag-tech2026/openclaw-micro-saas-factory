# Onboarding Tour System

A production-ready, accessible interactive tour for Next.js/React apps using react-joyride.

## Features

- **localStorage persistence** - Remembers if user completed the tour
- **Auto-start** - Optionally start tour automatically for first-time users
- **Replay anytime** - TourReplayButton component for reactivation
- **Accessible** - ARIA labels, focus trapping, keyboard navigation
- **Responsive** - Tooltips adjust for mobile and desktop
- **Customizable** - Full styling control via Joyride styles prop
- **TypeScript** - Fully typed interfaces

## Components

- `OnboardingTour` - Provider component that wraps your app
- `TourReplayButton` - Button to reset and restart the tour
- `useOnboardingTour` / `useTour` - Hook to control the tour programmatically

## Quick Start

### 1. Wrap your app

```tsx
import { OnboardingTour } from '@/components/onboarding';
import { OnboardingStep } from '@/components/onboarding';

const steps: OnboardingStep[] = [
  {
    target: '#feature-one',
    content: <div>...tooltip content...</div>,
    placement: 'bottom' as const,
  },
  // more steps...
];

export default function AppLayout({ children }) {
  return (
    <OnboardingTour
      config={{
        tourId: 'main-app',
        steps,
        onComplete: () => trackEvent('tour_completed'),
        onSkip: () => trackEvent('tour_skipped'),
        autoStartOnMount: true,
      }}
    >
      {children}
    </OnboardingTour>
  );
}
```

### 2. Add a replay button (optional)

```tsx
<TourReplayButton tourId="main-app" />
```

You can place this in a footer, settings menu, or help dropdown.

### 3. Programmatic control

Inside any child component, you can start/reset the tour:

```tsx
import { useOnboardingTour } from '@/components/onboarding';

function HelpPanel() {
  const { start, reset, isCompleted } = useOnboardingTour();

  return (
    <div>
      {isCompleted && <button onClick={() => start()}>Replay Tour</button>}
    </div>
  );
}
```

## API Reference

### OnboardingTour

Props:
- `config.tourId` (string) - Unique identifier for the tour (used in localStorage)
- `config.steps` (OnboardingStep[]) - Array of tour steps (see react-joyride Step)
- `config.onComplete` (() => void) - Called when tour finishes all steps
- `config.onSkip` (() => void) - Called when user skips the tour
- `config.autoStartOnMount` (boolean) - Auto-start if not completed

### TourReplayButton

Props:
- `tourId` (string) - Must match the tour's ID
- `id` (string, optional) - HTML ID attribute
- `className` (string, optional) - Additional CSS classes

### useOnboardingTour

Returns:
- `start: () => void` - Start the tour
- `reset: () => void` - Reset completion status and stop
- `isCompleted: boolean` - Whether tour has been completed
- `isRunning: boolean` - Whether tour is currently active

## Styling

The tour uses default styles that match Tailwind's blue palette. Override via the `styles` prop on `OnboardingTour` if needed.

## Accessibility

- Tour tooltips have `role="dialog"` and `aria-modal="true"`
- Focus is trapped within the active tooltip
- Keyboard navigation: Esc to close, Enter/Space for buttons
- Beacon is optional; set `disableBeacon` on step to hide

## Localization

The tour content is fully customizable. Provide your own React nodes with translated text.

## Notes

- Ensure target elements are present in the DOM before the tour starts. Use `autoStartOnMount={false}` and start manually after data is ready if needed.
- The tour only auto-starts if `isCompleted` is false (checked via localStorage).
- To support multiple tours, use different `tourId` values.
