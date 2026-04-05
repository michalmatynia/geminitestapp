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

import { useKangurMobileHomeLessonCheckpoints } from './useKangurMobileHomeLessonCheckpoints';

const createWrapper =
  (locale: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>
    );

describe('useKangurMobileHomeLessonCheckpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts the most recent saved lesson checkpoints and maps deep links', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        adding: {
          attempts: 2,
          bestScorePercent: 62,
          completions: 1,
          lastCompletedAt: '2026-03-21T08:00:00.000Z',
          lastScorePercent: 55,
          masteryPercent: 58,
        },
        clock: {
          attempts: 5,
          bestScorePercent: 100,
          completions: 4,
          lastCompletedAt: '2026-03-21T09:00:00.000Z',
          lastScorePercent: 100,
          masteryPercent: 96,
        },
        calendar: {
          attempts: 3,
          bestScorePercent: 88,
          completions: 2,
          lastCompletedAt: null,
          lastScorePercent: 80,
          masteryPercent: 84,
        },
      },
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(
      () => useKangurMobileHomeLessonCheckpoints({ limit: 2 }),
      {
        wrapper: createWrapper('pl'),
      },
    );

    expect(result.current.recentCheckpoints).toHaveLength(2);
    expect(result.current.recentCheckpoints[0]?.componentId).toBe('clock');
    expect(result.current.recentCheckpoints[0]?.lessonHref).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'clock',
      },
    });
    expect(result.current.recentCheckpoints[0]?.practiceHref).toEqual({
      pathname: '/practice',
      params: {
        operation: 'clock',
      },
    });
    expect(result.current.recentCheckpoints[1]?.componentId).toBe('adding');
  });

  it('localizes lesson titles for the current mobile locale', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        clock: {
          attempts: 1,
          bestScorePercent: 92,
          completions: 1,
          lastCompletedAt: '2026-03-21T09:00:00.000Z',
          lastScorePercent: 92,
          masteryPercent: 92,
        },
      },
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeLessonCheckpoints(), {
      wrapper: createWrapper('de'),
    });

    expect(result.current.recentCheckpoints[0]?.title).toBe('Uhr');
  });

  it('returns only the latest lesson checkpoint when the limit is one', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        addition_story: {
          attempts: 4,
          bestScorePercent: 88,
          completions: 2,
          lastCompletedAt: '2026-03-21T09:00:00.000Z',
          lastScorePercent: 82,
          masteryPercent: 81,
        },
        clock: {
          attempts: 5,
          bestScorePercent: 100,
          completions: 4,
          lastCompletedAt: '2026-03-21T09:00:00.000Z',
          lastScorePercent: 100,
          masteryPercent: 96,
        },
        adding: {
          attempts: 2,
          bestScorePercent: 62,
          completions: 1,
          lastCompletedAt: '2026-03-21T08:00:00.000Z',
          lastScorePercent: 55,
          masteryPercent: 58,
        },
      },
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(
      () => useKangurMobileHomeLessonCheckpoints({ limit: 1 }),
      {
        wrapper: createWrapper('en'),
      },
    );

    expect(result.current.recentCheckpoints).toHaveLength(1);
    expect(result.current.recentCheckpoints[0]?.componentId).toBe('clock');
  });
});
