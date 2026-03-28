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
    <div data-testid='mock-english-sentence-instance-runtime'>
      <span data-testid='mock-english-sentence-game-id'>{gameId}</span>
      <span data-testid='mock-english-sentence-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish english sentence
      </button>
    </div>
  ),
}));

import EnglishSentenceStructureLesson from '@/features/kangur/ui/components/EnglishSentenceStructureLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishSentenceStructureLesson', () => {
  it('opens the game stage through the launchable default instance', async () => {
    renderWithIntl(<EnglishSentenceStructureLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('english-sentence-structure-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-sentence-game-id')).toHaveTextContent(
      'english_sentence_builder'
    );
    expect(screen.getByTestId('mock-english-sentence-instance-id')).toHaveTextContent(
      'english_sentence_builder:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish english sentence' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });
});
