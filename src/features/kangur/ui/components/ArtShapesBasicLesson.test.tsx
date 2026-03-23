/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
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

import ArtShapesBasicLesson from '@/features/kangur/ui/components/ArtShapesBasicLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const AUTO_ADVANCE_DELAY_MS = 950;

const renderLesson = () =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <ArtShapesBasicLesson />
      </KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

const openRotationGame = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /uzupełnij wirujący wzór/i }));
};

const advanceRound = (): void => {
  act(() => {
    vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);
  });
};

const solveRound = ({
  optionId,
}: {
  optionId: string;
}): void => {
  fireEvent.click(screen.getByTestId(optionId));
  advanceRound();
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

  it('accepts the correct animated tile, shows a success overlay, and auto-advances', () => {
    renderLesson();

    openRotationGame();
    const correctOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');

    fireEvent.click(correctOption);

    expect(correctOption).toHaveAttribute('data-result-status', 'correct-selected');
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'V'
    );
    expect(screen.getByText('Dobrze', { selector: '.sr-only' })).toBeInTheDocument();
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
    expect(screen.getByText(/wynik: 1/i)).toBeInTheDocument();

    advanceRound();

    expect(screen.getByText(/runda 2\/4/i)).toBeInTheDocument();
  });

  it('shows wrong and correct overlays without rendering a separate panel', () => {
    renderLesson();

    openRotationGame();
    const wrongOption = screen.getByTestId('art-shapes-rotation-option-r1-book-fast-option');
    const correctOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');

    fireEvent.click(wrongOption);

    expect(wrongOption).toHaveAttribute('data-result-status', 'wrong-selected');
    expect(correctOption).toHaveAttribute('data-result-status', 'correct-answer');
    expect(wrongOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'X'
    );
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'V'
    );
    expect(screen.getByText('Nie to. To ten.', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText(/wynik: 0/i)).toBeInTheDocument();
    expect(wrongOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
    expect(screen.queryByText('To jeszcze nie ten.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /następny wzór/i })).not.toBeInTheDocument();
  });

  it('reaches the finished summary after solving all four rounds and can restart', () => {
    renderLesson();

    openRotationGame();

    solveRound({
      optionId: 'art-shapes-rotation-option-r1-pizza-fast',
    });
    solveRound({
      optionId: 'art-shapes-rotation-option-r2-circle-medium',
    });
    solveRound({
      optionId: 'art-shapes-rotation-option-r3-ball-fast',
    });
    solveRound({
      optionId: 'art-shapes-rotation-option-r4-book-fast',
    });

    expect(screen.getByText('Zadanie ukończone')).toBeInTheDocument();
    expect(screen.getByText(/udało ci się rozwiązać 4 z 4 wirujących wzorów/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /zagraj jeszcze raz/i }));

    expect(screen.getByText(/runda 1\/4/i)).toBeInTheDocument();
    expect(screen.getByText(/wynik: 0/i)).toBeInTheDocument();
    expect(screen.getByTestId('art-shapes-rotation-gap-placeholder')).toBeInTheDocument();
  });
});
