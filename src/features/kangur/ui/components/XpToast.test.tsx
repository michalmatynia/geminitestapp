/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import XpToast from '@/features/kangur/ui/components/XpToast';

describe('XpToast', () => {
  it('uses shared status chips for xp and badge rewards', () => {
    render(
      <XpToast
        dailyQuest={{
          title: '➗ Powtórka: Dzielenie',
          summary: '82% / 75% opanowania',
          xpAwarded: 55,
        }}
        breakdown={[
          { kind: 'base', label: 'Ukończenie rundy', xp: 10 },
          { kind: 'accuracy', label: 'Skuteczność', xp: 15 },
        ]}
        newBadges={['first_game']}
        nextBadge={{
          emoji: '🌟',
          name: 'Tysiącznik',
          summary: '480/1000 XP',
        }}
        recommendation={{
          label: 'Misja dnia',
          summary: 'Ten ruch domknął polecany kierunek i misję dnia.',
          title: '➗ Powtórka: Dzielenie',
        }}
        visible
        xpGained={25}
      />
    );

    expect(screen.getByTestId('xp-toast-xp-shell')).toHaveClass(
      'glass-panel',
      'kangur-surface-panel-accent-indigo',
      'rounded-[34px]'
    );
    expect(screen.getByTestId('xp-toast-badge-shell-first_game')).toHaveClass(
      'glass-panel',
      'kangur-surface-panel-accent-amber',
      'rounded-[34px]'
    );
    expect(screen.getByText('+25 XP')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-indigo-start,#a855f7))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-indigo-start,#a855f7))]'
    );
    expect(screen.getByText('Świetnie, trzymasz polecany kierunek')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-breakdown-base')).toHaveTextContent(
      'Ukończenie rundy +10'
    );
    expect(screen.getByTestId('xp-toast-breakdown-accuracy')).toHaveTextContent(
      'Skuteczność +15'
    );
    expect(screen.getByText(/Nowa odznaka/)).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-amber-start,#fb923c))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-amber-start,#fb923c))]'
    );
    expect(screen.getByText('Pierwsza gra')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-badge-desc-first_game')).toHaveTextContent(
      'Ukończ pierwszą grę'
    );
    expect(screen.getByTestId('xp-toast-next-badge')).toHaveTextContent(
      'Następna odznaka: 🌟 Tysiącznik · 480/1000 XP'
    );
    expect(screen.getByTestId('xp-toast-daily-quest')).toHaveTextContent(
      'Misja dnia ukończona: ➗ Powtórka: Dzielenie · 82% / 75% opanowania · +55 XP'
    );
    expect(screen.getByTestId('xp-toast-recommendation')).toHaveTextContent(
      'Polecony kierunek: ➗ Powtórka: Dzielenie · Ten ruch domknął polecany kierunek i misję dnia.'
    );
  });

  it('renders nothing when the toast is hidden', () => {
    const { container } = render(<XpToast newBadges={['first_game']} visible={false} xpGained={25} />);

    expect(container).toBeEmptyDOMElement();
  });
});
