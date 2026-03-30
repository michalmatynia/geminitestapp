/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';

import KangurRewardBreakdownChips from '../KangurRewardBreakdownChips';

describe('KangurRewardBreakdownChips i18n', () => {
  it('renders English reward breakdown labels from the progress runtime catalog', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <KangurRewardBreakdownChips
          breakdown={[
            { kind: 'base', label: 'Ukończenie rundy', xp: 10 },
            { kind: 'guided_focus', label: 'Polecony kierunek', xp: 3 },
            { kind: 'daily_quest', label: 'Misja dnia', xp: 55 },
          ]}
          dataTestId='reward-breakdown'
          itemDataTestIdPrefix='reward-breakdown'
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('reward-breakdown-base')).toHaveTextContent('Round completed +10');
    expect(screen.getByTestId('reward-breakdown-guided_focus')).toHaveTextContent(
      'Recommended path +3'
    );
    expect(screen.getByTestId('reward-breakdown-daily_quest')).toHaveTextContent(
      'Daily mission +55'
    );
  });

  it('keeps the provided label when no translation key exists for the breakdown kind', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <KangurRewardBreakdownChips
          breakdown={[{ kind: 'custom_bonus', label: 'Custom bonus', xp: 7 }]}
          itemDataTestIdPrefix='reward-breakdown'
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('reward-breakdown-custom_bonus')).toHaveTextContent(
      'Custom bonus +7'
    );
  });
});
