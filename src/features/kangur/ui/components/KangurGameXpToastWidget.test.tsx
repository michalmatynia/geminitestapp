/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock, xpToastPropsMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
  xpToastPropsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/progress', () => ({
  XpToast: (props: unknown) => {
    xpToastPropsMock(props);
    return <div data-testid='mock-xp-toast'>xp-toast</div>;
  },
}));

import { KangurGameXpToastWidget } from '@/features/kangur/ui/components/KangurGameXpToastWidget';

describe('KangurGameXpToastWidget', () => {
  it('forwards the full runtime toast state including recommendation and breakdown hints', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      xpToast: {
        visible: true,
        xpGained: 44,
        newBadges: ['first_game'],
        breakdown: [{ kind: 'base', label: 'Ukonczenie rundy', xp: 18 }],
        nextBadge: {
          emoji: '⭐',
          name: 'Pol tysiaca XP',
          summary: '420/500 XP',
        },
        dailyQuest: {
          title: '📅 Powtorka: Kalendarz',
          summary: '68% / 75% opanowania',
          xpAwarded: 55,
        },
        recommendation: {
          label: 'Misja dnia',
          summary: 'Ten ruch najmocniej przybliza odznake Pol tysiaca XP.',
          title: '📅 Powtorka: Kalendarz',
        },
      },
    });

    render(<KangurGameXpToastWidget />);

    expect(screen.getByTestId('mock-xp-toast')).toBeInTheDocument();
    expect(xpToastPropsMock).toHaveBeenCalledWith({
      visible: true,
      xpGained: 44,
      newBadges: ['first_game'],
      breakdown: [{ kind: 'base', label: 'Ukonczenie rundy', xp: 18 }],
      nextBadge: {
        emoji: '⭐',
        name: 'Pol tysiaca XP',
        summary: '420/500 XP',
      },
      dailyQuest: {
        title: '📅 Powtorka: Kalendarz',
        summary: '68% / 75% opanowania',
        xpAwarded: 55,
      },
      recommendation: {
        label: 'Misja dnia',
        summary: 'Ten ruch najmocniej przybliza odznake Pol tysiaca XP.',
        title: '📅 Powtorka: Kalendarz',
      },
    });
  });
});
