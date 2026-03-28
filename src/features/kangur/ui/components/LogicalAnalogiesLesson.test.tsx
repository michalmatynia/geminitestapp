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
    <div data-testid='mock-logical-analogies-instance-runtime'>
      <span data-testid='mock-logical-analogies-game-id'>{gameId}</span>
      <span data-testid='mock-logical-analogies-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish logical analogies
      </button>
    </div>
  ),
}));

import LogicalAnalogiesLesson from '@/features/kangur/ui/components/LogicalAnalogiesLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('LogicalAnalogiesLesson', () => {
  it('opens the game stage through the launchable default instance', async () => {
    renderWithIntl(<LogicalAnalogiesLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_relacje'));

    await waitFor(() => {
      expect(screen.getByTestId('logical-analogies-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-logical-analogies-game-id')).toHaveTextContent(
      'logical_analogies_relations'
    );
    expect(screen.getByTestId('mock-logical-analogies-instance-id')).toHaveTextContent(
      'logical_analogies_relations:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish logical analogies' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_relacje')).toBeInTheDocument();
    });
  });
});
