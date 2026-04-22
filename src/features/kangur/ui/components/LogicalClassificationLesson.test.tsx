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
    <div data-testid='mock-logical-classification-instance-runtime'>
      <span data-testid='mock-logical-classification-game-id'>{gameId}</span>
      <span data-testid='mock-logical-classification-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish logical classification
      </button>
    </div>
  ),
}));

import LogicalClassificationLesson from '@/features/kangur/ui/components/LogicalClassificationLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('LogicalClassificationLesson', () => {
  it('opens the game shell through the launchable default instance', async () => {
    renderWithIntl(<LogicalClassificationLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('logical-classification-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-logical-classification-game-id')).toHaveTextContent(
      'logical_classification_lab'
    );
    expect(screen.getByTestId('mock-logical-classification-instance-id')).toHaveTextContent(
      'logical_classification_lab:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish logical classification' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });
});
