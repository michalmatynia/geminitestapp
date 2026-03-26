/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }),
}));

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';
import ClockLesson from '@/features/kangur/ui/components/ClockLesson';

describe('time stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('passes shared calendar lesson-stage runtimes into KangurUnifiedLesson', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <CalendarLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Nauka kalendarza');

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: {
          runtimeId?: string;
          rendererId?: string;
          engineId?: string;
          rendererProps?: Record<string, unknown>;
        };
        onStageEnter?: unknown;
        render?: unknown;
      }>) ?? [];

    expect(games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'game_days',
          stage: expect.objectContaining({ shellTestId: 'calendar-lesson-game-shell' }),
          runtime: expect.objectContaining({
            runtimeId: 'calendar_interactive_days_lesson_stage',
            rendererId: 'calendar_interactive_stage_game',
            engineId: 'calendar-grid-engine',
            rendererProps: { calendarSection: 'dni' },
          }),
          onStageEnter: expect.any(Function),
        }),
        expect.objectContaining({
          sectionId: 'game_months',
          runtime: expect.objectContaining({
            runtimeId: 'calendar_interactive_months_lesson_stage',
            rendererId: 'calendar_interactive_stage_game',
            engineId: 'calendar-grid-engine',
            rendererProps: { calendarSection: 'miesiace' },
          }),
        }),
        expect.objectContaining({
          sectionId: 'game_dates',
          runtime: expect.objectContaining({
            runtimeId: 'calendar_interactive_dates_lesson_stage',
            rendererId: 'calendar_interactive_stage_game',
            engineId: 'calendar-grid-engine',
            rendererProps: { calendarSection: 'data' },
          }),
        }),
      ])
    );
    expect(games.every((game) => !('render' in game))).toBe(true);
  });

  it('passes shared clock lesson-stage runtimes into KangurUnifiedLesson', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ClockLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Nauka zegara');

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: {
          runtimeId?: string;
          rendererId?: string;
          engineId?: string;
          rendererProps?: Record<string, unknown>;
        };
        onStageFinish?: unknown;
        render?: unknown;
      }>) ?? [];

    expect(games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'game_hours',
          stage: expect.objectContaining({
            shellTestId: 'clock-lesson-training-shell',
            navigationPills: expect.anything(),
          }),
          runtime: expect.objectContaining({
            runtimeId: 'clock_training_hours_lesson_stage',
            rendererId: 'clock_training_stage_game',
            engineId: 'clock-dial-engine',
            rendererProps: { clockSection: 'hours' },
          }),
          onStageFinish: expect.any(Function),
        }),
        expect.objectContaining({
          sectionId: 'game_minutes',
          runtime: expect.objectContaining({
            runtimeId: 'clock_training_minutes_lesson_stage',
            rendererId: 'clock_training_stage_game',
            engineId: 'clock-dial-engine',
            rendererProps: { clockSection: 'minutes' },
          }),
        }),
        expect.objectContaining({
          sectionId: 'game_combined',
          runtime: expect.objectContaining({
            runtimeId: 'clock_training_combined_lesson_stage',
            rendererId: 'clock_training_stage_game',
            engineId: 'clock-dial-engine',
            rendererProps: { clockSection: 'combined' },
          }),
        }),
      ])
    );
    expect(games.every((game) => !('render' in game))).toBe(true);
  });
});
