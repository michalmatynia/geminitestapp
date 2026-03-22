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

import { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';

describe('useKangurMobilePracticeRecentResults', () => {
  it('maps shared recent results for practice into history and lesson links', () => {
    const refreshMock = vi.fn();
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: refreshMock,
      results: [
        {
          correct_answers: 6,
          created_date: '2026-03-22T08:00:00.000Z',
          id: 'score-practice-1',
          operation: 'clock',
          score: 6,
          time_taken: 30,
          total_questions: 8,
        },
      ],
    });

    const { result } = renderHook(() => useKangurMobilePracticeRecentResults());

    expect(useKangurMobileRecentResultsMock).toHaveBeenCalledWith({ limit: 3 });
    expect(result.current.recentResultItems).toHaveLength(1);
    expect(result.current.recentResultItems[0]).toEqual({
      historyHref: {
        pathname: '/results',
        params: {
          operation: 'clock',
        },
      },
      lessonHref: {
        pathname: '/lessons',
        params: {
          focus: 'clock',
        },
      },
      practiceHref: {
        pathname: '/practice',
        params: {
          operation: 'clock',
        },
      },
      result: {
        correct_answers: 6,
        created_date: '2026-03-22T08:00:00.000Z',
        id: 'score-practice-1',
        operation: 'clock',
        score: 6,
        time_taken: 30,
        total_questions: 8,
      },
    });
    expect(result.current.refresh).toBe(refreshMock);
  });
});
