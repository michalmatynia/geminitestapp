/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CalendarDateFormatAnimation,
  CalendarDateHighlightAnimation,
  CalendarDaysStripAnimation,
  CalendarMonthLengthAnimation,
  CalendarMonthsLoopAnimation,
  CalendarSeasonsCycleAnimation,
  CalendarWeekendPulseAnimation,
} from './CalendarLessonAnimations';

describe('CalendarLessonAnimations visuals', () => {
  it('renders upgraded calendar teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <CalendarDaysStripAnimation />
        <CalendarWeekendPulseAnimation />
        <CalendarMonthsLoopAnimation />
        <CalendarSeasonsCycleAnimation />
        <CalendarDateFormatAnimation />
        <CalendarDateHighlightAnimation />
        <CalendarMonthLengthAnimation />
      </>
    );

    expect(screen.getByTestId('calendar-days-strip-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-days-strip-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-days-strip-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-weekend-pulse-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-weekend-pulse-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-weekend-pulse-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-months-loop-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-months-loop-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-months-loop-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-seasons-cycle-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-seasons-cycle-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-seasons-cycle-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-date-format-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-date-format-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-date-format-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-date-highlight-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-date-highlight-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-date-highlight-frame')).toBeInTheDocument();

    expect(screen.getByTestId('calendar-month-length-animation')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-month-length-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-month-length-frame')).toBeInTheDocument();
  });
});
