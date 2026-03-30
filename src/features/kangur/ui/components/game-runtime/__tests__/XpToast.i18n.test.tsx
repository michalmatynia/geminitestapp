/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

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

import enMessages from '@/i18n/messages/en.json';

import XpToast from '../XpToast';

describe('XpToast i18n', () => {
  it('renders English reward, quest, recommendation, and badge copy', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <XpToast
          dailyQuest={{
            title: '➗ Review: Division',
            summary: '82% / 75% mastery',
            xpAwarded: 55,
          }}
          breakdown={[
            { kind: 'base', label: 'Ukończenie rundy', xp: 10 },
            { kind: 'daily_quest', label: 'Misja dnia', xp: 55 },
          ]}
          newBadges={['first_game']}
          nextBadge={{
            emoji: '🌟',
            name: 'Thousand club',
            summary: '480/1000 XP',
          }}
          recommendation={{
            label: 'Daily mission',
            summary: 'This move closed both the recommended path and the daily mission.',
            title: '➗ Review: Division',
          }}
          visible
          xpGained={25}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Great job, you stayed on the recommended path')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-breakdown-base')).toHaveTextContent('Round completed +10');
    expect(screen.getByTestId('xp-toast-breakdown-daily_quest')).toHaveTextContent(
      'Daily mission +55'
    );
    expect(screen.getByTestId('xp-toast-next-badge')).toHaveTextContent(
      'Next badge: 🌟 Thousand club · 480/1000 XP'
    );
    expect(screen.getByTestId('xp-toast-daily-quest')).toHaveTextContent(
      'Daily mission completed: ➗ Review: Division · 82% / 75% mastery · +55 XP'
    );
    expect(screen.getByTestId('xp-toast-recommendation')).toHaveTextContent(
      'Recommended path: ➗ Review: Division · This move closed both the recommended path and the daily mission.'
    );
    expect(screen.getByText('🎮 New badge')).toBeInTheDocument();
    expect(screen.getByText('First game')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-badge-desc-first_game')).toHaveTextContent(
      'Finish the first game'
    );
  });
});
