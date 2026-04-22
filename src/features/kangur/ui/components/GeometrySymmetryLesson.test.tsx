/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
    <div data-testid='mock-geometry-symmetry-instance-runtime'>
      <span data-testid='mock-geometry-symmetry-game-id'>{gameId}</span>
      <span data-testid='mock-geometry-symmetry-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish geometry symmetry
      </button>
    </div>
  ),
}));

import GeometrySymmetryLesson from '@/features/kangur/ui/components/GeometrySymmetryLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('GeometrySymmetryLesson', () => {
  it('opens the game shell through the launchable default instance', async () => {
    renderWithIntl(<GeometrySymmetryLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('geometry-symmetry-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-geometry-symmetry-game-id')).toHaveTextContent(
      'geometry_symmetry_studio'
    );
    expect(screen.getByTestId('mock-geometry-symmetry-instance-id')).toHaveTextContent(
      'geometry_symmetry_studio:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish geometry symmetry' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });
});
