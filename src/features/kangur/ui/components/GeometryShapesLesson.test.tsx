/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

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

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', () => ({
  useKangurLessonPanelProgress: () => ({
    markSectionOpened: vi.fn(),
    markSectionViewedCount: vi.fn(),
    recordPanelTime: vi.fn(),
    sectionProgress: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressOwnerKey', () => ({
  useKangurProgressOwnerKey: () => 'learner-1',
}));

vi.mock('@/features/kangur/ui/learner-activity/hooks', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/learner-activity/hooks')>();
  return {
    ...actual,
    useLessonTimeTracking: () => ({
      recordComplete: vi.fn(async () => undefined),
      recordPanelTime: vi.fn(),
    }),
  };
});

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonMastery: {},
  lessonsCompleted: 0,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]): unknown => addXpMock(...args),
    loadProgress: (...args: unknown[]): unknown => loadProgressMock(...args),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 16,
      progressUpdates: {},
      scorePercent: 60,
    })),
  };
});

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  default: ({
    gameId,
    instanceId,
    onFinish,
  }: {
    gameId: string;
    instanceId: string;
    onFinish: () => void;
  }): React.JSX.Element => (
    <div data-testid='mock-geometry-shapes-instance-runtime'>
      <span data-testid='mock-geometry-shapes-game-id'>{gameId}</span>
      <span data-testid='mock-geometry-shapes-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish geometry shapes
      </button>
    </div>
  ),
}));

import GeometryShapesLesson from '@/features/kangur/ui/components/GeometryShapesLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('GeometryShapesLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the game shell through the launchable default instance', async () => {
    renderWithIntl(<GeometryShapesLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('geometry-shapes-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-geometry-shapes-game-id')).toHaveTextContent(
      'geometry_shape_workshop'
    );
    expect(screen.getByTestId('mock-geometry-shapes-instance-id')).toHaveTextContent(
      'geometry_shape_workshop:instance:default'
    );
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: 'learner-1' });
    expect(addXpMock).toHaveBeenCalledWith(16, {}, { ownerKey: 'learner-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Finish geometry shapes' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });
});
