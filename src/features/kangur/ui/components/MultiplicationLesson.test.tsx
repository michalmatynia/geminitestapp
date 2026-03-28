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
    <div data-testid='mock-multiplication-instance-runtime'>
      <span data-testid='mock-multiplication-game-id'>{gameId}</span>
      <span data-testid='mock-multiplication-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish multiplication
      </button>
    </div>
  ),
}));

import MultiplicationLesson from '@/features/kangur/ui/components/MultiplicationLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('MultiplicationLesson', () => {
  it('opens the game stage through the launchable default instance', async () => {
    renderWithIntl(<MultiplicationLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_array'));

    await waitFor(() => {
      expect(screen.getByTestId('multiplication-lesson-game-array-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-multiplication-game-id')).toHaveTextContent(
      'multiplication_array'
    );
    expect(screen.getByTestId('mock-multiplication-instance-id')).toHaveTextContent(
      'multiplication_array:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish multiplication' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_array')).toBeInTheDocument();
    });
  });
});
