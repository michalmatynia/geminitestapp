/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(() => false),
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();

  return {
    ...actual,
    useReducedMotion: useReducedMotionMock,
  };
});

import { ArtShapesRotationGapGame } from '@/features/kangur/ui/components/ArtShapesRotationGapGame';

const AUTO_ADVANCE_DELAY_MS = 950;

const renderGame = (onFinish = vi.fn()) => {
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      <ArtShapesRotationGapGame onFinish={onFinish} />
    </NextIntlClientProvider>
  );

  return { onFinish };
};

const advanceRound = (): void => {
  act(() => {
    vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);
  });
};

const solveRound = ({
  optionLabel,
}: {
  optionLabel: RegExp;
}): void => {
  fireEvent.click(screen.getByRole('button', { name: optionLabel }));
  advanceRound();
};

const finishGame = (): void => {
  solveRound({
    optionLabel: /wybierz kawałek pizzy, szybki obrót/i,
  });
  solveRound({
    optionLabel: /wybierz koło, średni obrót/i,
  });
  solveRound({
    optionLabel: /wybierz piłka, szybki obrót/i,
  });
  solveRound({
    optionLabel: /wybierz książka, szybki obrót/i,
  });
};

describe('ArtShapesRotationGapGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useReducedMotionMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the responsive board and theme-driven option cards', () => {
    renderGame();

    const layout = screen.getByTestId('art-shapes-rotation-layout');
    const board = screen.getByTestId('art-shapes-rotation-pattern-board');
    const choiceTray = screen.getByTestId('art-shapes-rotation-choice-tray');
    const options = screen.getByTestId('art-shapes-rotation-gap-options');
    const firstOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');
    const optionTile = firstOption.querySelector('.art-shapes-rotation-tile');
    const optionBadge = firstOption.querySelector('.art-shapes-rotation-option-card__badge');
    const firstLayoutChild = layout.firstElementChild;
    const track = board.querySelector('.art-shapes-rotation-pattern-board__track');
    const gapPlaceholder = screen.getByTestId('art-shapes-rotation-gap-placeholder');

    expect(layout).toHaveClass('flex', 'flex-col', 'gap-5');
    expect(board.querySelector('.art-shapes-rotation-pattern-board__frame')).not.toBeNull();
    expect(track).not.toBeNull();
    expect(track?.getAttribute('d')?.trim().endsWith('Z')).toBe(true);
    expect(firstLayoutChild?.contains(board)).toBe(true);
    expect(layout.lastElementChild).toBe(choiceTray);
    expect(options).toHaveClass(
      'grid',
      'grid-flow-col',
      'overflow-x-auto',
      'min-[420px]:grid-flow-row',
      'min-[420px]:grid-cols-3'
    );
    expect(firstOption).toHaveClass('art-shapes-rotation-option-card');
    expect(optionBadge).not.toBeNull();
    expect(optionBadge).toHaveTextContent('A');
    expect(gapPlaceholder).toHaveClass('art-shapes-rotation-pattern-board__window--spotlight');
    expect(optionTile).not.toBeNull();
    expect(optionTile?.style.getPropertyValue('--art-shapes-accent-start')).not.toBe('');
    expect(optionTile?.style.getPropertyValue('--art-shapes-accent-end')).not.toBe('');
    expect(screen.queryByText(/przyjrzyj się sześcioczęściowemu wzorowi/i)).not.toBeInTheDocument();
  });

  it('freezes tile animation after a choice is made', () => {
    renderGame();

    expect(document.querySelectorAll('.art-shapes-rotation-spinner--static')).toHaveLength(0);

    const correctOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');

    fireEvent.click(correctOption);

    expect(document.querySelectorAll('.art-shapes-rotation-spinner--static').length).toBeGreaterThan(0);
    expect(correctOption).toHaveAttribute('data-result-status', 'correct-selected');
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'V'
    );
    expect(screen.getByText('Dobrze', { selector: '.sr-only' })).toBeInTheDocument();
    expect(correctOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
  });

  it('renders static tiles from the start when reduced motion is preferred', () => {
    useReducedMotionMock.mockReturnValue(true);

    renderGame();

    expect(document.querySelectorAll('.art-shapes-rotation-spinner--static').length).toBeGreaterThan(0);
    expect(screen.getByTestId('art-shapes-rotation-gap-placeholder')).not.toHaveClass(
      'art-shapes-rotation-pattern-board__window--spotlight'
    );
  });

  it('locks the option grid after a choice is made', () => {
    renderGame();

    const options = screen.getByTestId('art-shapes-rotation-gap-options');
    const firstOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');
    const secondOption = screen.getByTestId('art-shapes-rotation-option-r1-triangle-fast-option');

    fireEvent.click(firstOption);

    expect(options).toHaveAttribute('data-selection-locked', 'true');
    expect(options).toHaveAttribute('aria-disabled', 'true');
    expect(firstOption).toHaveAttribute('aria-disabled', 'true');
    expect(firstOption).toHaveAttribute('tabindex', '-1');
    expect(secondOption).toHaveAttribute('aria-disabled', 'true');
    expect(secondOption).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('button', { name: /następny wzór/i })).not.toBeInTheDocument();
  });

  it('shows visual right and wrong overlays on the option cards before auto-advancing', () => {
    renderGame();

    const wrongOption = screen.getByTestId('art-shapes-rotation-option-r1-book-fast-option');
    const rightOption = screen.getByTestId('art-shapes-rotation-option-r1-pizza-fast');

    fireEvent.click(wrongOption);

    expect(wrongOption).toHaveAttribute('data-result-status', 'wrong-selected');
    expect(rightOption).toHaveAttribute('data-result-status', 'correct-answer');
    expect(wrongOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'X'
    );
    expect(rightOption.querySelector('.art-shapes-rotation-option-card__result-symbol')).toHaveTextContent(
      'V'
    );
    expect(screen.getByText('Nie to. To ten.', { selector: '.sr-only' })).toBeInTheDocument();
    expect(wrongOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
    expect(rightOption.querySelector('.art-shapes-rotation-option-card__feedback')).toBeNull();
    expect(screen.queryByText('Brawo!')).not.toBeInTheDocument();
  });

  it('calls onFinish from the finished summary only after all rounds are completed', () => {
    const { onFinish } = renderGame();

    expect(screen.getByText(/runda 1\/4/i)).toBeInTheDocument();
    expect(screen.getByTestId('art-shapes-rotation-gap-placeholder')).toBeInTheDocument();

    finishGame();

    expect(screen.getByText('Zadanie ukończone')).toBeInTheDocument();
    expect(screen.getByText(/udało ci się rozwiązać 4 z 4 wirujących wzorów/i)).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /wróć do lekcji/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('restarts from the first round when play again is used on the summary screen', () => {
    renderGame();

    finishGame();

    fireEvent.click(screen.getByRole('button', { name: /zagraj jeszcze raz/i }));

    expect(screen.getByText(/runda 1\/4/i)).toBeInTheDocument();
    expect(screen.getByText(/wynik: 0/i)).toBeInTheDocument();
    expect(screen.getByTestId('art-shapes-rotation-gap-placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wybierz kawałek pizzy, szybki obrót/i })).toBeInTheDocument();
  });
});
