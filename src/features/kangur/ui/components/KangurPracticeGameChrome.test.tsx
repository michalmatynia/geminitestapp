/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
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
      'kangur-panel-gap'
    );
    expect(screen.getByTestId('practice-progress')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('3/6')).toHaveClass('text-xs', 'font-bold');
  });

  it('renders the shared practice game summary shell with granular components', () => {
    render(
      <KangurPracticeGameSummary dataTestId='practice-summary-shell'>
        <KangurPracticeGameSummaryEmoji dataTestId='practice-summary-emoji' emoji='🏆' />
        <KangurPracticeGameSummaryTitle dataTestId='practice-summary-title' title='Wynik: 6/6' />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={12} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={[
            { kind: 'accuracy', label: 'Skuteczność', xp: 8 },
            { kind: 'streak', label: 'Seria', xp: 4 },
          ]}
          dataTestId='practice-summary-breakdown'
          itemDataTestIdPrefix='practice-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='indigo'
          dataTestId='practice-summary-progress'
          percent={100}
        />
        <KangurPracticeGameSummaryMessage>Świetna robota!</KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel='Wróć'
          onFinish={vi.fn()}
          onRestart={vi.fn()}
        />
      </KangurPracticeGameSummary>
    );

    expect(screen.getByTestId('practice-summary-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByTestId('practice-summary-emoji')).toHaveClass('text-6xl');
    expect(screen.getByTestId('practice-summary-title')).toHaveTextContent('Wynik: 6/6');
    expect(screen.getByTestId('practice-summary-progress')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('+12 XP ✨')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('practice-summary-breakdown')).toHaveTextContent('Skuteczność');
    expect(screen.getByRole('button', { name: /jeszcze raz/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: 'Wróć' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
  });

  it('can render extra summary content blocks using custom layout', () => {
    render(
      <KangurPracticeGameSummary dataTestId='practice-summary-custom-shell'>
        <KangurPracticeGameSummaryEmoji dataTestId='practice-summary-custom-emoji' emoji='🌟' />
        <KangurPracticeGameSummaryTitle title='Wynik: 7/10' />
        <p>Tryb: Wyzwanie</p>
        <KangurPracticeGameSummaryProgress
          accent='amber'
          dataTestId='practice-summary-custom-progress'
          percent={70}
        />
        <p>70% poprawnych odpowiedzi</p>
        <KangurPracticeGameSummaryMessage>Dobra robota!</KangurPracticeGameSummaryMessage>
      </KangurPracticeGameSummary>
    );

    expect(screen.getByText('Tryb: Wyzwanie')).toBeInTheDocument();
    expect(screen.getByText('70% poprawnych odpowiedzi')).toBeInTheDocument();
    expect(screen.getByTestId('practice-summary-custom-progress')).toHaveAttribute(
      'aria-valuenow',
      '70'
    );
    expect(screen.queryByRole('button', { name: /jeszcze raz/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ignored' })).toBeNull();
  });
});
