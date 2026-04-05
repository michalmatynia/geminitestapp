/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { useKangurMobileRuntimeMock } = vi.hoisted(() => ({
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileHomeBadges } from './useKangurMobileHomeBadges';

const createWrapper =
  (locale: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>
    );

describe('useKangurMobileHomeBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps recent unlocked badges from local progress and deduplicates repeated ids', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      badges: ['first_game', 'lesson_hero', 'clock_master', 'clock_master'],
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeBadges(), {
      wrapper: createWrapper('pl'),
    });

    expect(result.current).toEqual({
      recentBadges: [
        {
          emoji: '🕐',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
        {
          emoji: '🎮',
          id: 'first_game',
          name: 'Pierwsza gra',
        },
      ],
      remainingBadges: 6,
      totalBadges: 9,
      unlockedBadges: 3,
    });
  });

  it('localizes badge names for the current mobile locale', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      badges: ['first_game', 'clock_master'],
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeBadges(), {
      wrapper: createWrapper('de'),
    });

    expect(result.current.recentBadges).toEqual([
      {
        emoji: '🕐',
        id: 'clock_master',
        name: 'Uhrmeister',
      },
      {
        emoji: '🎮',
        id: 'first_game',
        name: 'Erstes Spiel',
      },
    ]);
  });
});
