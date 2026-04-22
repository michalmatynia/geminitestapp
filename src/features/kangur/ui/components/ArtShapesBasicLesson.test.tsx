/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    addXp: vi.fn(),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 28,
      scorePercent: 100,
      progressUpdates: {},
    })),
    loadProgress: vi.fn(() => createDefaultKangurProgressState()),
  };
});

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  KangurLaunchableGameInstanceRuntime: ({
    gameId,
  }: {
    gameId: string;
  }): React.JSX.Element => <div data-testid={`mock-launchable-game-${gameId}`} />,
  default: ({
    gameId,
  }: {
    gameId: string;
  }): React.JSX.Element => <div data-testid={`mock-launchable-game-${gameId}`} />,
}));

import ArtShapesBasicLesson from '@/features/kangur/ui/components/ArtShapesBasicLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (messages: typeof plMessages = plMessages) =>
  render(
    <NextIntlClientProvider locale='pl' messages={messages}>
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <ArtShapesBasicLesson />
      </KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

const openRotationGame = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /uzupełnij wirujący wzór/i }));
};

describe('ArtShapesBasicLesson', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the spinning pattern game in the lesson activity shell', () => {
    renderLesson();

    openRotationGame();

    expect(screen.getByTestId('art-shapes-rotation-gap-game-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.queryByText(/przyjrzyj się sześcioczęściowemu wzorowi\./i)).not.toBeInTheDocument();
  });

  it('shows the shared print-summary fallback for the launched puzzle shell', () => {
    renderLesson();

    openRotationGame();
    expect(screen.getByTestId('lesson-activity-shell-print-summary')).toBeInTheDocument();
    expect(
      screen.getByText('Otwórz tę lekcję na ekranie, aby wykonać to ćwiczenie interaktywnie.')
    ).toBeInTheDocument();
  });

  it('keeps the shared lesson back button instead of inline puzzle navigation controls', () => {
    renderLesson();

    openRotationGame();

    expect(screen.getByRole('button', { name: /wróć do tematów/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /następny wzór/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /zagraj jeszcze raz/i })).not.toBeInTheDocument();
  });

  it('keeps the lesson-shell print summary scoped to the launched puzzle stage', () => {
    renderLesson();

    openRotationGame();

    const printSummary = screen.getByTestId('lesson-activity-shell-print-summary');

    expect(within(printSummary).getByText('Uzupełnij wirujący wzór')).toBeInTheDocument();
    expect(
      within(printSummary).getByText('Otwórz tę lekcję na ekranie, aby wykonać to ćwiczenie interaktywnie.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Zadanie ukończone')).not.toBeInTheDocument();
  });

});
