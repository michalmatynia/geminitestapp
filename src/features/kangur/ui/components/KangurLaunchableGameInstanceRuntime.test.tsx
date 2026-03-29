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
} = vi.hoisted(() => ({
  useKangurGameInstancesMock: vi.fn(),
  useKangurGameContentSetsMock: vi.fn(),
  kangurLaunchableGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameInstances', () => ({
  useKangurGameInstances: (...args: unknown[]) => useKangurGameInstancesMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameContentSets', () => ({
  useKangurGameContentSets: (...args: unknown[]) => useKangurGameContentSetsMock(...args),
}));

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameRuntime', () => ({
  __esModule: true,
  default: (props: { onFinish: () => void; runtime: KangurLaunchableGameRuntimeSpec }) => {
    kangurLaunchableGameRuntimeMock(props);
    return <div data-testid='kangur-launchable-game-runtime' />;
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

  it('waits for the persisted game instance before rendering the runtime', () => {
    useKangurGameInstancesMock.mockReturnValue({
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

    expect(
      screen.getByTestId('kangur-launchable-game-instance-runtime-loading')
    ).toBeInTheDocument();
    expect(kangurLaunchableGameRuntimeMock).not.toHaveBeenCalled();
  });

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

  it('shows the missing state when the persisted content set is absent instead of falling back to built-in data', () => {
    useKangurGameInstancesMock.mockReturnValue({
      data: [
        {
          id: 'clock_training:instance:clock-minutes',
          gameId: 'clock_training',
          launchableRuntimeId: 'clock_quiz',
          contentSetId: 'clock_training:clock-minutes',
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
});
