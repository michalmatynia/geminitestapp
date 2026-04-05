/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { useKangurMobileRuntimeMock } = vi.hoisted(() => ({
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileLessons } from './useKangurMobileLessons';

const createProgressSnapshot = () => ({
  ...createDefaultKangurProgressState(),
  lessonMastery: {
    clock: {
      attempts: 4,
      bestScorePercent: 100,
      completions: 4,
      lastCompletedAt: '2026-03-20T12:00:00.000Z',
      lastScorePercent: 90,
      masteryPercent: 92,
    },
  },
});

const createWrapper =
  (locale: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>;

describe('useKangurMobileLessons', () => {
  let progressSnapshot = createProgressSnapshot();
  const saveProgressMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    progressSnapshot = createProgressSnapshot();
    saveProgressMock.mockImplementation((progress) => {
      progressSnapshot = progress;
      return progress;
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        saveProgress: saveProgressMock,
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });
  });

  it('localizes lesson catalog and mastery copy for German mobile lessons', () => {
    const { result } = renderHook(() => useKangurMobileLessons('clock'), {
      wrapper: createWrapper('de'),
    });

    expect(result.current.selectedLesson?.lesson.title).toBe('Uhr');
    expect(result.current.selectedLesson?.lesson.description).toBe(
      'Stunden, Minuten und volle Uhrzeit auf einer analogen Uhr.',
    );
    expect(result.current.selectedLesson?.mastery.statusLabel).toBe('Beherrscht 92%');
    expect(result.current.selectedLesson?.mastery.summaryLabel).toContain(
      'bestes Ergebnis 100%',
    );
    expect(result.current.selectedLesson?.checkpointSummary).toEqual({
      attempts: 4,
      bestScorePercent: 100,
      lastCompletedAt: '2026-03-20T12:00:00.000Z',
      lastScorePercent: 90,
      masteryPercent: 92,
    });
    expect(result.current.selectedLesson?.practiceHref).toEqual({
      pathname: '/practice',
      params: {
        operation: 'clock',
      },
    });
  });

  it('saves a completed lesson checkpoint into mobile progress', () => {
    const { result } = renderHook(() => useKangurMobileLessons('clock'), {
      wrapper: createWrapper('pl'),
    });

    let saveResult:
      | {
          countsAsLessonCompletion: boolean;
          newBadges: string[];
          scorePercent: number;
        }
      | null = null;

    act(() => {
      saveResult = result.current.saveLessonCheckpoint({
        countsAsLessonCompletion: true,
        lessonComponentId: 'clock',
        scorePercent: 100,
      });
    });

    expect(saveResult).toEqual({
      countsAsLessonCompletion: true,
      newBadges: ['lesson_hero'],
      scorePercent: 100,
    });
    expect(saveProgressMock).toHaveBeenCalledTimes(1);
    expect(progressSnapshot.lessonsCompleted).toBe(1);
    expect(progressSnapshot.badges).toContain('lesson_hero');
    expect(progressSnapshot.lessonMastery.clock).toMatchObject({
      attempts: 5,
      completions: 5,
      lastScorePercent: 100,
    });
  });
});
