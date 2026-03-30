/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

import {
  ClockCombinedHandsAnimation,
  ClockFiveMinuteStepsAnimation,
  ClockHourHandSweepAnimation,
  ClockMinuteByMinuteAnimation,
  ClockSecondHandAnimation,
} from './ClockLessonAnimations';

const renderClockAnimation = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('ClockLessonAnimations visuals', () => {
  it('renders the upgraded shared clock frame surface across clock animations', () => {
    renderClockAnimation(
      <>
        <ClockHourHandSweepAnimation />
        <ClockFiveMinuteStepsAnimation />
        <ClockCombinedHandsAnimation />
        <ClockMinuteByMinuteAnimation />
        <ClockSecondHandAnimation />
      </>
    );

    expect(screen.getByTestId('clock-hour-hand-sweep-animation')).toBeInTheDocument();
    expect(screen.getByTestId('clock-hour-hand-sweep-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('clock-hour-hand-sweep-frame')).toBeInTheDocument();

    expect(screen.getByTestId('clock-five-minute-steps-animation')).toBeInTheDocument();
    expect(screen.getByTestId('clock-five-minute-steps-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('clock-five-minute-steps-frame')).toBeInTheDocument();

    expect(screen.getByTestId('clock-combined-hands-animation')).toBeInTheDocument();
    expect(screen.getByTestId('clock-combined-hands-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('clock-combined-hands-frame')).toBeInTheDocument();

    expect(screen.getByTestId('clock-minute-by-minute-animation')).toBeInTheDocument();
    expect(screen.getByTestId('clock-minute-by-minute-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('clock-minute-by-minute-frame')).toBeInTheDocument();

    expect(screen.getByTestId('clock-second-hand-animation')).toBeInTheDocument();
    expect(screen.getByTestId('clock-second-hand-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('clock-second-hand-frame')).toBeInTheDocument();
  });
});
