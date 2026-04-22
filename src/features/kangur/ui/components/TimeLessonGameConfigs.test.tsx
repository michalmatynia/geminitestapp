/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

let capturedProps: Record<string, unknown> | null = null;
let lessonGameSectionsState: Array<Record<string, unknown>> = [];

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
  useKangurAuthSessionState: () => ({
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
  useKangurUnifiedLessonBack: () => vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonGameSections', () => ({
  useKangurLessonGameSections: (options?: { enabledOnly?: boolean }) => ({
    data: options?.enabledOnly
      ? lessonGameSectionsState.filter(
          (section) => (section.enabled as boolean | undefined) !== false
        )
      : lessonGameSectionsState,
    isPending: false,
  }),
}));

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';
import ClockLesson from '@/features/kangur/ui/components/ClockLesson';

describe('time lesson game configs', () => {
  afterEach(() => {
    capturedProps = null;
    lessonGameSectionsState = [];
  });

  it('passes shared calendar instances into KangurUnifiedLesson', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <CalendarLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Nauka kalendarza');

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
        lessonActivityInstance?: {
          gameId?: string;
          instanceId?: string;
        };
        onShellEnter?: unknown;
        render?: unknown;
      }>) ?? [];

    expect(games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'game_days',
          shell: expect.objectContaining({ shellTestId: 'calendar-lesson-game-shell' }),
          lessonActivityInstance: expect.objectContaining({
            gameId: 'calendar_interactive',
            instanceId: 'calendar_interactive:instance:calendar-days',
          }),
          onShellEnter: expect.any(Function),
        }),
        expect.objectContaining({
          sectionId: 'game_months',
          lessonActivityInstance: expect.objectContaining({
            gameId: 'calendar_interactive',
            instanceId: 'calendar_interactive:instance:calendar-months',
          }),
        }),
        expect.objectContaining({
          sectionId: 'game_dates',
          lessonActivityInstance: expect.objectContaining({
            gameId: 'calendar_interactive',
            instanceId: 'calendar_interactive:instance:calendar-dates',
          }),
        }),
      ])
    );
    expect(games.every((game) => !('render' in game))).toBe(true);
  });

  it('passes shared clock instances into KangurUnifiedLesson', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ClockLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Nauka zegara');

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
        launchableInstance?: {
          gameId?: string;
          instanceId?: string;
        };
        engineOverrides?: Record<string, unknown>;
        onShellFinish?: unknown;
        render?: unknown;
      }>) ?? [];

    expect(games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'game_hours',
          shell: expect.objectContaining({
            shellTestId: 'clock-lesson-training-shell',
            navigationPills: expect.anything(),
          }),
          launchableInstance: expect.objectContaining({
            gameId: 'clock_training',
            instanceId: 'clock_training:instance:clock-hours',
          }),
          engineOverrides: {},
          onShellFinish: expect.any(Function),
        }),
        expect.objectContaining({
          sectionId: 'game_minutes',
          launchableInstance: expect.objectContaining({
            gameId: 'clock_training',
            instanceId: 'clock_training:instance:clock-minutes',
          }),
          engineOverrides: {},
        }),
        expect.objectContaining({
          sectionId: 'game_combined',
          launchableInstance: expect.objectContaining({
            gameId: 'clock_training',
            instanceId: 'clock_training:instance:default',
          }),
          engineOverrides: {},
        }),
      ])
    );
    expect(games.every((game) => !('render' in game))).toBe(true);
  });

  it('appends persisted clock hub cards with saved renderer props', () => {
    lessonGameSectionsState = [
      {
        id: 'clock_custom_minutes',
        instanceId: 'clock_training:instance:clock-hours',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Ćwiczenie: Minuty bez czasu cyfrowego',
        description: 'Nowa karta zapisana z biblioteki gier.',
        emoji: '🧩',
        sortOrder: 10,
        enabled: true,
        settings: {
          clock: {
            clockSection: 'minutes',
            initialMode: 'challenge',
            showHourHand: false,
            showMinuteHand: true,
            showModeSwitch: true,
            showTaskTitle: true,
            showTimeDisplay: false,
          },
        },
      },
    ];

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ClockLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        launchableInstance?: { instanceId?: string };
        engineOverrides?: Record<string, unknown>;
      }>) ?? [];

    expect(games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'clock_custom_minutes',
          launchableInstance: expect.objectContaining({
            instanceId: 'clock_training:instance:clock-hours',
          }),
          engineOverrides: expect.objectContaining({
            clockInitialMode: 'challenge',
            showClockHourHand: false,
            showClockMinuteHand: true,
            showClockModeSwitch: true,
            showClockTaskTitle: true,
            showClockTimeDisplay: false,
          }),
        }),
      ])
    );
  });

  it('skips disabled persisted clock hub cards from the lesson config', () => {
    lessonGameSectionsState = [
      {
        id: 'clock_custom_disabled',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Ukryta karta zegara',
        description: 'Ta karta nie powinna trafic do lesson huba.',
        emoji: '🙈',
        sortOrder: 9,
        enabled: false,
        settings: {
          clock: {
            clockSection: 'combined',
            initialMode: 'practice',
            showHourHand: true,
            showMinuteHand: true,
            showModeSwitch: true,
            showTaskTitle: true,
            showTimeDisplay: true,
          },
        },
      },
    ];

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ClockLesson />
      </NextIntlClientProvider>
    );

    const sectionIds =
      (capturedProps?.games as Array<{
        sectionId: string;
      }>)?.map((game) => game.sectionId) ?? [];

    expect(sectionIds).not.toContain('clock_custom_disabled');
  });
});
