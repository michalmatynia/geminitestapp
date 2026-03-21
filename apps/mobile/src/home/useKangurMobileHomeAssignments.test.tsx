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

import { useKangurMobileHomeAssignments } from './useKangurMobileHomeAssignments';

const createWrapper =
  (locale: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <KangurMobileI18nProvider locale={locale}>{children}</KangurMobileI18nProvider>
    );

describe('useKangurMobileHomeAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds starter home assignments when there is no saved lesson progress yet', () => {
    const progressSnapshot = createDefaultKangurProgressState();

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeAssignments(), {
      wrapper: createWrapper('pl'),
    });

    expect(result.current.assignmentItems[0]?.assignment.title).toBe(
      'Pierwsza lekcja startowa',
    );
    expect(result.current.assignmentItems[0]?.href).toEqual({
      pathname: '/lessons',
    });
  });

  it('maps lesson review assignments into focused lesson links', () => {
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
      },
    };

    useKangurMobileRuntimeMock.mockReturnValue({
      progressStore: {
        subscribeToProgress: () => () => {},
        loadProgress: () => progressSnapshot,
      },
    });

    const { result } = renderHook(() => useKangurMobileHomeAssignments(), {
      wrapper: createWrapper('en'),
    });

    expect(result.current.assignmentItems[0]?.assignment.title).toContain('Review');
    expect(result.current.assignmentItems[0]?.href).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'adding',
      },
    });
  });
});
