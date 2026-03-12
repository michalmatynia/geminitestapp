/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';

describe('KangurPracticeGameChrome', () => {
  it('renders the shared practice game stage and progress row', () => {
    render(
      <KangurPracticeGameStage data-testid='practice-stage'>
        <KangurPracticeGameProgress
          accent='amber'
          currentRound={2}
          dataTestId='practice-progress'
          totalRounds={6}
        />
      </KangurPracticeGameStage>
    );

    expect(screen.getByTestId('practice-stage')).toHaveClass(
      'flex',
      'w-full',
      'max-w-sm',
      'flex-col',
      'items-center',
      'gap-4'
    );
    expect(screen.getByTestId('practice-progress')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('3/6')).toHaveClass('text-xs', 'font-bold');
  });

  it('renders the shared practice game summary shell', () => {
    render(
      <KangurPracticeGameSummary
        accent='indigo'
        breakdown={[
          { kind: 'accuracy', label: 'Za celność', xp: 8 },
          { kind: 'streak', label: 'Za serię', xp: 4 },
        ]}
        breakdownDataTestId='practice-summary-breakdown'
        breakdownItemDataTestIdPrefix='practice-summary-breakdown'
        dataTestId='practice-summary-shell'
        emojiDataTestId='practice-summary-emoji'
        emoji='🏆'
        finishLabel='Wróć'
        message='Świetna robota!'
        onFinish={vi.fn()}
        onRestart={vi.fn()}
        percent={100}
        progressAccent='indigo'
        progressDataTestId='practice-summary-progress'
        title='Wynik: 6/6'
        titleDataTestId='practice-summary-title'
        xpAccent='indigo'
        xpEarned={12}
      />
    );

    expect(screen.getByTestId('practice-summary-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('practice-summary-emoji')).toHaveClass('text-6xl');
    expect(screen.getByTestId('practice-summary-title')).toHaveTextContent('Wynik: 6/6');
    expect(screen.getByTestId('practice-summary-progress')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('+12 XP ✨')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('practice-summary-breakdown')).toHaveTextContent('Za celność');
    expect(screen.getByRole('button', { name: /jeszcze raz/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: 'Wróć' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
  });

  it('can hide summary actions and render extra summary content blocks', () => {
    render(
      <KangurPracticeGameSummary
        accent='amber'
        actionsHidden
        breakdown={[]}
        breakdownDataTestId='practice-summary-hidden-breakdown'
        breakdownItemDataTestIdPrefix='practice-summary-hidden-breakdown'
        dataTestId='practice-summary-hidden-shell'
        emoji='🌟'
        emojiDataTestId='practice-summary-hidden-emoji'
        finishLabel='Ignored'
        message='Dobra robota!'
        onFinish={vi.fn()}
        onRestart={vi.fn()}
        percent={70}
        postProgressContent={<p>70% poprawnych odpowiedzi</p>}
        preProgressContent={<p>Tryb: Wyzwanie</p>}
        progressAccent='amber'
        progressDataTestId='practice-summary-hidden-progress'
        title='Wynik: 7/10'
      />
    );

    expect(screen.getByText('Tryb: Wyzwanie')).toBeInTheDocument();
    expect(screen.getByText('70% poprawnych odpowiedzi')).toBeInTheDocument();
    expect(screen.getByTestId('practice-summary-hidden-progress')).toHaveAttribute(
      'aria-valuenow',
      '70'
    );
    expect(screen.queryByRole('button', { name: /jeszcze raz/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ignored' })).toBeNull();
  });
});
