/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { useKangurMobileHomeBadgesMock } = vi.hoisted(() => ({
  useKangurMobileHomeBadgesMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileHomeBadges', () => ({
  useKangurMobileHomeBadges: useKangurMobileHomeBadgesMock,
}));

import { useKangurMobileProfileBadges } from './useKangurMobileProfileBadges';

describe('useKangurMobileProfileBadges', () => {
  it('combines the shared badge summary with the profile badge grid', () => {
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '🎮',
          id: 'first_game',
          name: 'Pierwsza gra',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });

    const { result } = renderHook(
      () =>
        useKangurMobileProfileBadges({
          unlockedBadgeIds: ['first_game', 'lesson_hero'],
        }),
      {
        wrapper: ({ children }) => (
          <KangurMobileI18nProvider locale='pl'>{children}</KangurMobileI18nProvider>
        ),
      },
    );

    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(result.current.recentBadges).toEqual([
      {
        emoji: '🎮',
        id: 'first_game',
        name: 'Pierwsza gra',
      },
    ]);
    expect(result.current.unlockedBadges).toBe(2);
    expect(result.current.totalBadges).toBe(9);
    expect(result.current.remainingBadges).toBe(7);
    expect(result.current.allBadges.find((badge) => badge.id === 'first_game')).toMatchObject({
      emoji: '🎮',
      id: 'first_game',
      unlocked: true,
    });
    expect(result.current.allBadges.find((badge) => badge.id === 'clock_master')).toMatchObject({
      id: 'clock_master',
      unlocked: false,
    });
  });
});
