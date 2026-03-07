/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResultScreen from '@/features/kangur/ui/components/ResultScreen';

describe('ResultScreen', () => {
  it('uses the shared Kangur progress bar for the score summary', () => {
    render(
      <ResultScreen
        onHome={vi.fn()}
        onRestart={vi.fn()}
        operation='addition'
        playerName='Maja'
        score={3}
        timeTaken={42}
        total={4}
      />
    );

    expect(screen.getByRole('heading', { name: 'Swietna robota, Maja!' })).toBeInTheDocument();
    expect(screen.getByTestId('result-screen-title')).toHaveClass('text-3xl', 'text-slate-800');
    expect(screen.getByText('Dodawanie')).toBeInTheDocument();
    expect(screen.getByTestId('result-screen-emoji')).toHaveClass('inline-flex', 'text-6xl');
    expect(screen.getByTestId('result-screen-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('result-screen-progress-bar')).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByTestId('result-screen-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      '75% poprawnych odpowiedzi'
    );
    expect(screen.getByTestId('result-screen-progress-bar')).toHaveClass(
      'rounded-full',
      'bg-slate-100/95'
    );
    expect(screen.getByRole('button', { name: /Strona glowna/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });
});
