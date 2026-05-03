/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurLaunchableGameRuntimeSpec } from '@/shared/contracts/kangur-games';

const {
  useKangurGameInstancesMock,
  useKangurGameContentSetsMock,
  kangurLaunchableGameRuntimeMock,
  kangurLessonActivityInstanceRuntimeMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurGameInstancesMock: vi.fn(),
  useKangurGameContentSetsMock: vi.fn(),
  kangurLaunchableGameRuntimeMock: vi.fn(),
  kangurLessonActivityInstanceRuntimeMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameInstances', () => ({
  useKangurGameInstances: (...args: unknown[]) => useKangurGameInstancesMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameContentSets', () => ({
  useKangurGameContentSets: (...args: unknown[]) => useKangurGameContentSetsMock(...args),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameRuntime', () => ({
  __esModule: true,
  default: (props: { onFinish: () => void; runtime: KangurLaunchableGameRuntimeSpec }) => {
    kangurLaunchableGameRuntimeMock(props);
    return <div data-testid='kangur-launchable-game-runtime' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurLessonActivityInstanceRuntime', () => ({
  __esModule: true,
  default: (props: { config: { gameId: string; instanceId: string; onFinish: () => void } }) => {
    kangurLessonActivityInstanceRuntimeMock(props);
    return <div data-testid='kangur-lesson-activity-instance-runtime' />;
  },
}));

import KangurLaunchableGameInstanceRuntime from '@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime';

describe('KangurLaunchableGameInstanceRuntime', () => {
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

  it('waits for a custom persisted game instance before rendering the runtime', () => {
    useKangurGameInstancesMock.mockReturnValue({
      data: [],
      isPending: true,
    });

    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:custom-hours'
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByTestId('kangur-launchable-game-instance-runtime-loading')
    ).toBeInTheDocument();
    expect(kangurLaunchableGameRuntimeMock).not.toHaveBeenCalled();
  });

  it('renders a built-in instance runtime even when no persisted instance data is returned', () => {
    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:clock-hours'
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-launchable-game-runtime')).toBeInTheDocument();
    expect(kangurLaunchableGameRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          screen: 'clock_quiz',
          rendererProps: expect.objectContaining({
            clockSection: 'hours',
          }),
        }),
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_launchable_game_viewed',
      expect.objectContaining({
        gameId: 'clock_training',
        instanceId: 'clock_training:instance:clock-hours',
        runtimeScreen: 'clock_quiz',
        rendererId: 'clock_training_game',
        engineId: 'clock-dial-engine',
        instanceSource: 'built_in',
        contentSetSource: 'built_in',
      })
    );
  });

  it.each([
    {
      gameId: 'adding_ball',
      instanceId: 'adding_ball:instance:default',
      screen: 'addition_quiz',
      maxWidthClassName: 'max-w-2xl',
    },
    {
      gameId: 'adding_synthesis',
      instanceId: 'adding_synthesis:instance:default',
      screen: 'adding_synthesis_quiz',
      maxWidthClassName: 'max-w-[1120px]',
    },
    {
      gameId: 'subtracting_garden',
      instanceId: 'subtracting_garden:instance:default',
      screen: 'subtraction_quiz',
      maxWidthClassName: 'max-w-none',
    },
    {
      gameId: 'division_groups',
      instanceId: 'division_groups:instance:default',
      screen: 'division_quiz',
      maxWidthClassName: 'max-w-none',
    },
    {
      gameId: 'multiplication_array',
      instanceId: 'multiplication_array:instance:default',
      screen: 'multiplication_array_quiz',
      maxWidthClassName: 'max-w-none',
    },
  ])(
    'renders the built-in arithmetic runtime contract for $instanceId',
    ({ gameId, instanceId, maxWidthClassName, screen: runtimeScreen }) => {
      render(
        <KangurLaunchableGameInstanceRuntime
          gameId={gameId}
          instanceId={instanceId}
          onFinish={vi.fn()}
        />
      );

      expect(screen.getByTestId('kangur-launchable-game-runtime')).toBeInTheDocument();
      expect(kangurLaunchableGameRuntimeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: expect.objectContaining({
            screen: runtimeScreen,
            shell: expect.objectContaining({
              maxWidthClassName,
            }),
          }),
        })
      );
    }
  );

  it('renders the persisted runtime with fetched content-set props and merged overrides', () => {
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
      <KangurLaunchableGameInstanceRuntime
        engineOverrides={{ showClockTaskTitle: false }}
        gameId='clock_training'
        instanceId='clock_training:instance:clock-hours'
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-launchable-game-runtime')).toBeInTheDocument();
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
    expect(kangurLaunchableGameRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          screen: 'clock_quiz',
          rendererProps: expect.objectContaining({
            clockInitialMode: 'challenge',
            clockSection: 'hours',
            showClockTaskTitle: false,
          }),
        }),
      })
    );
  });

  it('keeps built-in content-set fallbacks available for built-in instances while the query is pending', () => {
    useKangurGameContentSetsMock.mockReturnValue({
      data: [],
      isPending: true,
    });

    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:clock-minutes'
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-launchable-game-runtime')).toBeInTheDocument();
    expect(kangurLaunchableGameRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          rendererProps: expect.objectContaining({
            clockSection: 'minutes',
          }),
        }),
      })
    );
  });

  it('shows the missing state when a persisted custom content set is absent', () => {
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        {
          id: 'clock_training:instance:clock-minutes',
          gameId: 'clock_training',
          launchableRuntimeId: 'clock_quiz',
          contentSetId: 'clock_training:custom:minutes-only',
          title: 'Minutes only',
          description: 'Persisted minute session.',
          emoji: '🕒',
          enabled: true,
          sortOrder: 1,
          engineOverrides: {},
        },
      ],
      isPending: false,
    });

    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:clock-minutes'
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByTestId('kangur-launchable-game-instance-runtime-missing')
    ).toBeInTheDocument();
    expect(kangurLaunchableGameRuntimeMock).not.toHaveBeenCalled();
  });

  it('tracks launchable finish events before delegating to the outer finish handler', () => {
    const onFinish = vi.fn();

    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:clock-hours'
        onFinish={onFinish}
      />
    );

    const runtimeProps = kangurLaunchableGameRuntimeMock.mock.calls[0]?.[0] as
      | {
          onFinish: () => void;
          runtime: KangurLaunchableGameRuntimeSpec;
        }
      | undefined;

    expect(runtimeProps).toBeDefined();
    runtimeProps?.onFinish();

    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_launchable_game_finished',
      expect.objectContaining({
        gameId: 'clock_training',
        instanceId: 'clock_training:instance:clock-hours',
        runtimeScreen: 'clock_quiz',
        rendererId: 'clock_training_game',
      })
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('uses the lesson activity runtime for lesson-inline games when preferred', () => {
    render(
      <KangurLaunchableGameInstanceRuntime
        gameId='clock_training'
        instanceId='clock_training:instance:clock-hours'
        onFinish={vi.fn()}
        preferLessonActivityRuntime
      />
    );

    expect(
      screen.getByTestId('kangur-lesson-activity-instance-runtime')
    ).toBeInTheDocument();
    expect(kangurLessonActivityInstanceRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          gameId: 'clock_training',
          instanceId: 'clock_training:instance:clock-hours',
        }),
      })
    );
    expect(kangurLaunchableGameRuntimeMock).not.toHaveBeenCalled();
    expect(trackKangurClientEventMock).not.toHaveBeenCalled();
  });
});
