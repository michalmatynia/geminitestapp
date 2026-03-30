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
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', () => ({
  useKangurLessonPanelProgress: () => ({
    markSectionOpened: vi.fn(),
    markSectionViewedCount: vi.fn(),
    recordPanelTime: vi.fn(),
    sectionProgress: {},
  }),
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
    <div data-testid='mock-geometry-basics-instance-runtime'>
      <span data-testid='mock-geometry-basics-game-id'>{gameId}</span>
      <span data-testid='mock-geometry-basics-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish geometry basics
      </button>
    </div>
  ),
}));

import GeometryBasicsLesson from '@/features/kangur/ui/components/GeometryBasicsLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('GeometryBasicsLesson', () => {
  it('opens the game shell through the launchable default instance', async () => {
    renderWithIntl(<GeometryBasicsLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('geometry-basics-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-geometry-basics-game-id')).toHaveTextContent(
      'geometry_shape_workshop'
    );
    expect(screen.getByTestId('mock-geometry-basics-instance-id')).toHaveTextContent(
      'geometry_shape_workshop:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish geometry basics' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });
});
