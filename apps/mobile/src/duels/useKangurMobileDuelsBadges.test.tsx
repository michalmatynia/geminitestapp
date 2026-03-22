/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurMobileHomeBadgesMock } = vi.hoisted(() => ({
  useKangurMobileHomeBadgesMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileHomeBadges', () => ({
  useKangurMobileHomeBadges: useKangurMobileHomeBadgesMock,
}));

import { useKangurMobileDuelsBadges } from './useKangurMobileDuelsBadges';

describe('useKangurMobileDuelsBadges', () => {
  it('reuses the shared home badge summary for the duels surface', () => {
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '⚔️',
          id: 'duel_starter',
          name: 'Początek pojedynku',
        },
      ],
      remainingBadges: 5,
      totalBadges: 9,
      unlockedBadges: 4,
    });

    const { result } = renderHook(() => useKangurMobileDuelsBadges());

    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      recentBadges: [
        {
          emoji: '⚔️',
          id: 'duel_starter',
          name: 'Początek pojedynku',
        },
      ],
      remainingBadges: 5,
      totalBadges: 9,
      unlockedBadges: 4,
    });
  });
});
