/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

import {
  ClockFiveMinuteStepsAnimation,
  ClockHourHandSweepAnimation,
} from './ClockLessonAnimations';
import { AnalogClock } from './ClockLesson.visuals';
import { KANGUR_CLOCK_THEME_COLORS } from './clock-theme';
import { DraggableClock } from './clock-training/DraggableClock';

const renderWithIntl = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('Clock theme palette', () => {
  it('uses storefront theme vars in the interactive clock renderer', () => {
    const { container } = renderWithIntl(
      <DraggableClock
        challengeTimeLeft={1}
        challengeTimeLimit={10}
        onSubmit={() => {}}
        showChallengeRing
        submitFeedback='correct'
        submitFeedbackDetails='Keep going.'
        submitFeedbackTitle='Correct'
      />
    );

    const face = container.querySelector('circle[r="95"]');
    const numeral = container.querySelector('text');
    const submitButton = screen.getByTestId('clock-submit-button');
    const feedbackPanel = screen.getByTestId('clock-submit-feedback');
    const hourLegendDot = screen.getByTestId('clock-hour-legend-dot');
    const minuteLegendDot = screen.getByTestId('clock-minute-legend-dot');

    expect(face).not.toBeNull();
    expect(face).toHaveAttribute('fill', KANGUR_CLOCK_THEME_COLORS.faceFill);
    expect(face).toHaveAttribute('stroke', KANGUR_CLOCK_THEME_COLORS.faceStroke);
    expect(numeral).not.toBeNull();
    expect(numeral).toHaveAttribute('fill', KANGUR_CLOCK_THEME_COLORS.numeral);
    expect(screen.getByTestId('clock-hour-hand')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.interactiveHourHand
    );
    expect(screen.getByTestId('clock-minute-hand')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.interactiveMinuteHand
    );
    expect(screen.getByTestId('clock-challenge-ring-track')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.challengeTrack
    );
    expect(screen.getByTestId('clock-challenge-ring')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.challengeLow
    );
    expect(hourLegendDot.getAttribute('style') ?? '').toContain(
      `background-color: ${KANGUR_CLOCK_THEME_COLORS.interactiveHourHand};`
    );
    expect(minuteLegendDot.getAttribute('style') ?? '').toContain(
      `background-color: ${KANGUR_CLOCK_THEME_COLORS.interactiveMinuteHand};`
    );
    expect(submitButton.getAttribute('style') ?? '').toContain(
      `background-color: ${KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBackground};`
    );
    expect(submitButton.getAttribute('style') ?? '').toContain(
      `border-color: ${KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBorder};`
    );
    expect(submitButton.getAttribute('style') ?? '').toContain(
      `color: ${KANGUR_CLOCK_THEME_COLORS.contrastText};`
    );
    expect(feedbackPanel.getAttribute('style') ?? '').toContain(
      `background-color: ${KANGUR_CLOCK_THEME_COLORS.feedbackCorrectSoftBackground};`
    );
    expect(feedbackPanel.getAttribute('style') ?? '').toContain(
      `border-color: ${KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBorder};`
    );
    expect(feedbackPanel.getAttribute('style') ?? '').toContain(
      `color: ${KANGUR_CLOCK_THEME_COLORS.feedbackCorrectText};`
    );
  });

  it('uses storefront theme vars in lesson clocks', () => {
    const { container } = renderWithIntl(<AnalogClock hours={8} label='Example' minutes={30} />);

    const face = container.querySelector('circle[r="95"]');
    const numeral = container.querySelector('text');

    expect(face).not.toBeNull();
    expect(face).toHaveAttribute('fill', KANGUR_CLOCK_THEME_COLORS.faceFill);
    expect(face).toHaveAttribute('stroke', KANGUR_CLOCK_THEME_COLORS.faceStroke);
    expect(numeral).not.toBeNull();
    expect(numeral).toHaveAttribute('fill', KANGUR_CLOCK_THEME_COLORS.numeral);
    expect(screen.getByTestId('clock-lesson-hour-hand')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.lessonHourHand
    );
    expect(screen.getByTestId('clock-lesson-minute-hand')).toHaveAttribute(
      'stroke',
      KANGUR_CLOCK_THEME_COLORS.lessonMinuteHand
    );
  });

  it('uses storefront theme vars in lesson animations', () => {
    renderWithIntl(
      <>
        <ClockHourHandSweepAnimation />
        <ClockFiveMinuteStepsAnimation />
      </>
    );

    const hourSweep = screen.getByTestId('clock-hour-hand-sweep-animation');
    const steps = screen.getByTestId('clock-five-minute-steps-animation');
    const hourSweepStyles = hourSweep.querySelectorAll('style');
    const stepsStyles = steps.querySelectorAll('style');
    const hourSweepBaseStyle = hourSweepStyles[0];
    const hourSweepAnimationStyle = hourSweepStyles[1];
    const stepsAnimationStyle = stepsStyles[1];

    expect(hourSweep.innerHTML).toContain(KANGUR_CLOCK_THEME_COLORS.faceGradientStart);
    expect(hourSweep.innerHTML).toContain(KANGUR_CLOCK_THEME_COLORS.faceGradientMid);
    expect(hourSweep.innerHTML).toContain(KANGUR_CLOCK_THEME_COLORS.faceGradientEnd);
    expect(hourSweep.innerHTML).toContain(KANGUR_CLOCK_THEME_COLORS.atmosphereStart);
    expect(hourSweep.innerHTML).toContain(KANGUR_CLOCK_THEME_COLORS.atmosphereEnd);
    expect(hourSweepBaseStyle?.textContent).toContain(KANGUR_CLOCK_THEME_COLORS.faceStroke);
    expect(hourSweepBaseStyle?.textContent).toContain(KANGUR_CLOCK_THEME_COLORS.majorTick);
    expect(hourSweepAnimationStyle?.textContent).toContain(
      KANGUR_CLOCK_THEME_COLORS.highlightHourHand
    );
    expect(stepsAnimationStyle?.textContent).toContain(KANGUR_CLOCK_THEME_COLORS.stepFill);
    expect(stepsAnimationStyle?.textContent).toContain(KANGUR_CLOCK_THEME_COLORS.stepLabel);
  });
});
