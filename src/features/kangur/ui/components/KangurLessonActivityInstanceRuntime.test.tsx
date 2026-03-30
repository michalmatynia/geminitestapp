/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurLessonActivityRuntimeSpec } from '@/shared/contracts/kangur-games';

const {
  kangurLessonActivityRuntimeMock,
  useKangurGameContentSetsMock,
  useKangurGameInstancesMock,
} = vi.hoisted(() => ({
  kangurLessonActivityRuntimeMock: vi.fn(),
  useKangurGameContentSetsMock: vi.fn(),
  useKangurGameInstancesMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameInstances', () => ({
  useKangurGameInstances: (...args: unknown[]) => useKangurGameInstancesMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameContentSets', () => ({
  useKangurGameContentSets: (...args: unknown[]) => useKangurGameContentSetsMock(...args),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonActivityRuntime', () => ({
  __esModule: true,
  KangurLessonActivityRuntime: (props: {
    onFinish: () => void;
    rendererProps?: Record<string, unknown>;
    runtime: KangurLessonActivityRuntimeSpec;
  }) => {
    kangurLessonActivityRuntimeMock(props);
    return <div data-testid='kangur-lesson-activity-runtime' />;
  },
}));

import KangurLessonActivityInstanceRuntime from '@/features/kangur/ui/components/KangurLessonActivityInstanceRuntime';

describe('KangurLessonActivityInstanceRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurGameInstancesMock.mockReturnValue({
      data: [],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [],
      isPending: false,
    });
  });

  it('renders a built-in calendar lesson activity instance with the section from its content set', () => {
    render(
      <KangurLessonActivityInstanceRuntime
        gameId='calendar_interactive'
        instanceId='calendar_interactive:instance:calendar-months'
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-lesson-activity-runtime')).toBeInTheDocument();
    expect(kangurLessonActivityRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rendererProps: expect.objectContaining({
          calendarSection: 'miesiace',
        }),
        runtime: expect.objectContaining({
          activityId: 'calendar-interactive',
          rendererId: 'calendar_interactive_game',
        }),
      })
    );
  });

  it('renders merged persisted lesson activity renderer props for custom instances', () => {
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        {
          id: 'clock_training:instance:clock-hours',
          gameId: 'clock_training',
          launchableRuntimeId: 'clock_quiz',
          contentSetId: 'clock_training:clock-hours',
          title: 'Hours only',
          description: 'Persisted hours session.',
          emoji: '🕐',
          enabled: true,
          sortOrder: 1,
          engineOverrides: {
            clockInitialMode: 'challenge',
          },
        },
      ],
      isPending: false,
    });
    useKangurGameContentSetsMock.mockReturnValue({
      data: [
        {
          id: 'clock_training:clock-hours',
          gameId: 'clock_training',
          engineId: 'clock_training_engine',
          launchableRuntimeId: 'clock_quiz',
          label: 'Hours only',
          description: 'Persisted hour-reading content set.',
          contentKind: 'clock_section',
          rendererProps: {
            clockSection: 'hours',
          },
          sortOrder: 2,
        },
      ],
      isPending: false,
    });

    render(
      <KangurLessonActivityInstanceRuntime
        engineOverrides={{ showClockTaskTitle: false }}
        gameId='clock_training'
        instanceId='clock_training:instance:clock-hours'
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-lesson-activity-runtime')).toBeInTheDocument();
    expect(useKangurGameInstancesMock).toHaveBeenCalledWith({
      enabledOnly: true,
      gameId: 'clock_training',
      instanceId: 'clock_training:instance:clock-hours',
    });
    expect(useKangurGameContentSetsMock).toHaveBeenCalledWith({
      contentSetId: 'clock_training:clock-hours',
      enabled: true,
      gameId: 'clock_training',
    });
    expect(kangurLessonActivityRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rendererProps: expect.objectContaining({
          clockInitialMode: 'challenge',
          clockSection: 'hours',
          showClockTaskTitle: false,
        }),
        runtime: expect.objectContaining({
          activityId: 'clock-training',
          rendererId: 'clock_training_game',
        }),
      })
    );
  });

  it('shows the missing state when a persisted custom content set is absent', () => {
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        {
          id: 'calendar_interactive:instance:custom-dates',
          gameId: 'calendar_interactive',
          launchableRuntimeId: 'calendar_quiz',
          contentSetId: 'calendar_interactive:custom:dates',
          title: 'Dates only',
          description: 'Persisted dates session.',
          emoji: '📅',
          enabled: true,
          sortOrder: 1,
          engineOverrides: {},
        },
      ],
      isPending: false,
    });

    render(
      <KangurLessonActivityInstanceRuntime
        gameId='calendar_interactive'
        instanceId='calendar_interactive:instance:custom-dates'
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByTestId('kangur-lesson-activity-instance-runtime-missing')
    ).toBeInTheDocument();
    expect(kangurLessonActivityRuntimeMock).not.toHaveBeenCalled();
  });
});
