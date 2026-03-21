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
  beforeEach(() => {
    vi.clearAllMocks();

    const progressSnapshot = createProgressSnapshot();

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
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
  });
});
