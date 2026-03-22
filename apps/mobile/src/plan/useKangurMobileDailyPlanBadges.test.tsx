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

import { useKangurMobileDailyPlanBadges } from './useKangurMobileDailyPlanBadges';

describe('useKangurMobileDailyPlanBadges', () => {
  it('reuses the shared home badge summary for the daily-plan surface', () => {
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '🕐',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
      ],
      remainingBadges: 6,
      totalBadges: 9,
      unlockedBadges: 3,
    });

    const { result } = renderHook(() => useKangurMobileDailyPlanBadges());

    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      recentBadges: [
        {
          emoji: '🕐',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
      ],
      remainingBadges: 6,
      totalBadges: 9,
      unlockedBadges: 3,
    });
  });
});
