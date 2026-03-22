/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurMobileRecentResultsMock } = vi.hoisted(() => ({
  useKangurMobileRecentResultsMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileRecentResults', () => ({
  useKangurMobileRecentResults: useKangurMobileRecentResultsMock,
}));

import { useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';

describe('useKangurMobileLessonsRecentResults', () => {
  it('maps shared recent results into lesson-aware history and practice links', () => {
    const refreshMock = vi.fn();
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: refreshMock,
      results: [
        {
          correct_answers: 7,
          created_date: '2026-03-21T08:00:00.000Z',
          id: 'score-1',
          operation: 'addition',
          total_questions: 8,
        },
      ],
    });

    const { result } = renderHook(() => useKangurMobileLessonsRecentResults());

    expect(useKangurMobileRecentResultsMock).toHaveBeenCalledWith({ limit: 2 });
    expect(result.current).toEqual({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResultItems: [
        {
          historyHref: {
            pathname: '/results',
            params: {
              operation: 'addition',
            },
          },
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          result: {
            correct_answers: 7,
            created_date: '2026-03-21T08:00:00.000Z',
            id: 'score-1',
            operation: 'addition',
            total_questions: 8,
          },
        },
      ],
      refresh: refreshMock,
    });
  });
});
