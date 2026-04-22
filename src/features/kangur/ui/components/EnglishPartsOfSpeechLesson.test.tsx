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
    <div data-testid='mock-english-parts-instance-runtime'>
      <span data-testid='mock-english-parts-game-id'>{gameId}</span>
      <span data-testid='mock-english-parts-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        {gameId === 'english_pronouns_warmup' ? 'Finish pronouns warmup' : 'Finish parts of speech'}
      </button>
    </div>
  ),
}));

import EnglishPartsOfSpeechLesson from '@/features/kangur/ui/components/EnglishPartsOfSpeechLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishPartsOfSpeechLesson', () => {
  it('opens the pronouns warmup through the launchable default instance', async () => {
    renderWithIntl(<EnglishPartsOfSpeechLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_pronouns_warmup'));

    await waitFor(() => {
      expect(screen.getByTestId('english-pronouns-warmup-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-parts-game-id')).toHaveTextContent(
      'english_pronouns_warmup'
    );
    expect(screen.getByTestId('mock-english-parts-instance-id')).toHaveTextContent(
      'english_pronouns_warmup:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish pronouns warmup' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_pronouns_warmup')).toBeInTheDocument();
    });
  });

  it('opens the parts-of-speech game shell through the launchable default instance', async () => {
    renderWithIntl(<EnglishPartsOfSpeechLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_parts_of_speech'));

    await waitFor(() => {
      expect(screen.getByTestId('english-parts-of-speech-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-parts-game-id')).toHaveTextContent(
      'english_parts_of_speech_sort'
    );
    expect(screen.getByTestId('mock-english-parts-instance-id')).toHaveTextContent(
      'english_parts_of_speech_sort:instance:default'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish parts of speech' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_parts_of_speech')).toBeInTheDocument();
    });
  });
});
