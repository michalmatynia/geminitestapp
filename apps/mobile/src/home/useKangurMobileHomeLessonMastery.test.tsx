/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { useKangurMobileRuntimeMock } = vi.hoisted(() => ({
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileHomeLessonMastery } from './useKangurMobileHomeLessonMastery';

const createWrapper =
  (locale: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>
    );

describe('useKangurMobileHomeLessonMastery', () => {
  const progressSnapshot = {
    ...createDefaultKangurProgressState(),
    lessonMastery: {
      adding: {
        attempts: 3,
        bestScorePercent: 72,
        completions: 1,
        lastCompletedAt: '2026-03-21T08:00:00.000Z',
        lastScorePercent: 70,
        masteryPercent: 68,
      },
      clock: {
        attempts: 5,
        bestScorePercent: 100,
        completions: 4,
        lastCompletedAt: '2026-03-21T09:00:00.000Z',
        lastScorePercent: 100,
        masteryPercent: 96,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });
  });

  it('maps local lesson mastery into home insight cards and deep links', () => {
    const { result } = renderHook(() => useKangurMobileHomeLessonMastery(), {
      wrapper: createWrapper('pl'),
    });

    expect(result.current.trackedLessons).toBe(2);
    expect(result.current.masteredLessons).toBe(1);
    expect(result.current.lessonsNeedingPractice).toBe(1);
    expect(result.current.weakest[0]?.componentId).toBe('adding');
    expect(result.current.weakest[0]?.lessonHref).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'adding',
      },
    });
    expect(result.current.weakest[0]?.practiceHref).toEqual({
      pathname: '/practice',
      params: {
        operation: 'addition',
      },
    });
    expect(result.current.strongest[0]?.title).toBe('Nauka zegara');
  });

  it('localizes lesson titles for the current mobile locale', () => {
    const { result } = renderHook(() => useKangurMobileHomeLessonMastery(), {
      wrapper: createWrapper('de'),
    });

    expect(result.current.weakest[0]?.title).toBe('Addition');
    expect(result.current.strongest[0]?.title).toBe('Uhr');
  });
});
