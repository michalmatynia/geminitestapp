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

import { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';

describe('useKangurMobilePracticeBadges', () => {
  it('reuses the shared home badge summary for the practice surface', () => {
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

    const { result } = renderHook(() => useKangurMobilePracticeBadges());

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
