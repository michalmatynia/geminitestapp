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

import { useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';

describe('useKangurMobileLessonsBadges', () => {
  it('reuses the shared home badge summary for the lessons surface', () => {
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });

    const { result } = renderHook(() => useKangurMobileLessonsBadges());

    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      recentBadges: [
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });
  });
});
