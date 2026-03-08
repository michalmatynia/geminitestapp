/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurMobileRecentResultsMock,
  useKangurMobileTrainingFocusMock,
  useKangurMobileLearnerProfileMock,
  profileRefreshMock,
  resultsRefreshMock,
  focusRefreshMock,
  signInMock,
} = vi.hoisted(() => ({
  useKangurMobileRecentResultsMock: vi.fn(),
  useKangurMobileTrainingFocusMock: vi.fn(),
  useKangurMobileLearnerProfileMock: vi.fn(),
  profileRefreshMock: vi.fn(),
  resultsRefreshMock: vi.fn(),
  focusRefreshMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileRecentResults', () => ({
  useKangurMobileRecentResults: useKangurMobileRecentResultsMock,
}));

vi.mock('../home/useKangurMobileTrainingFocus', () => ({
  useKangurMobileTrainingFocus: useKangurMobileTrainingFocusMock,
}));

vi.mock('../profile/useKangurMobileLearnerProfile', () => ({
  useKangurMobileLearnerProfile: useKangurMobileLearnerProfileMock,
}));

import { useKangurMobileDailyPlan } from './useKangurMobileDailyPlan';

describe('useKangurMobileDailyPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileRefreshMock.mockResolvedValue(undefined);
    resultsRefreshMock.mockResolvedValue(undefined);
    focusRefreshMock.mockResolvedValue(undefined);
    signInMock.mockResolvedValue(undefined);

    useKangurMobileLearnerProfileMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          title: 'Powtorka dodawania',
          description: 'Skup sie na najslabszym obszarze.',
          target: '1 lekcja',
          priority: 'high',
          action: {
            label: 'Otworz lekcje',
            page: 'Lessons',
            query: {
              focus: 'adding',
            },
          },
        },
        {
          id: 'assignment-2',
          title: 'Trening celowany',
          description: 'Uruchom jedna runde praktyki.',
          target: '8 pytan',
          priority: 'medium',
          action: {
            label: 'Uruchom trening',
            page: 'Game',
            query: {
              operation: 'addition',
            },
          },
        },
        {
          id: 'assignment-3',
          title: 'Powtorka logiki',
          description: 'Wroc do logicznych wzorcow.',
          target: '1 lekcja',
          priority: 'low',
          action: {
            label: 'Otworz lekcje',
            page: 'Lessons',
            query: {
              focus: 'logical_patterns',
            },
          },
        },
        {
          id: 'assignment-4',
          title: 'Nadmiarowy wpis',
          description: 'Nie powinien trafic do top 3.',
          target: 'pomijamy',
          priority: 'low',
          action: {
            label: 'Soon',
            page: 'LearnerProfile',
          },
        },
      ],
      authError: null,
      authMode: 'learner-session',
      displayName: 'Ada Learner',
      getActionHref: vi.fn((action) =>
        action.page === 'Lessons' ? '/lessons' : '/practice?operation=addition',
      ),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingScores: false,
      masteryInsights: null,
      recommendationsNote: '',
      refreshScores: profileRefreshMock,
      scoresError: null,
      signIn: signInMock,
      supportsLearnerCredentials: true,
      snapshot: null,
    });

    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: resultsRefreshMock,
      results: [
        {
          id: 'score-1',
          operation: 'addition',
          correct_answers: 7,
          total_questions: 8,
        },
      ],
    });

    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: focusRefreshMock,
      strongestLessonFocus: 'multiplication',
      strongestOperation: {
        averageAccuracyPercent: 94,
        bestAccuracyPercent: 100,
        family: 'arithmetic',
        operation: 'multiplication',
        sessions: 4,
      },
      weakestLessonFocus: 'adding',
      weakestOperation: {
        averageAccuracyPercent: 52,
        bestAccuracyPercent: 63,
        family: 'arithmetic',
        operation: 'addition',
        sessions: 3,
      },
    });
  });

  it('combines top assignments, recent results, focus data, and refresh actions', async () => {
    const { result } = renderHook(() => useKangurMobileDailyPlan());

    expect(result.current.assignmentItems).toHaveLength(3);
    expect(result.current.displayName).toBe('Ada Learner');
    expect(result.current.weakestFocus?.operation.operation).toBe('addition');
    expect(result.current.weakestFocus?.practiceHref).toEqual({
      pathname: '/practice',
      params: {
        operation: 'addition',
      },
    });
    expect(result.current.weakestFocus?.lessonHref).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'adding',
      },
    });
    expect(result.current.strongestFocus?.operation.operation).toBe(
      'multiplication',
    );
    expect(result.current.strongestFocus?.historyHref).toEqual({
      pathname: '/results',
      params: {
        operation: 'multiplication',
      },
    });
    expect(result.current.recentResultItems).toHaveLength(1);
    expect(result.current.recentResultItems[0]?.historyHref).toEqual({
      pathname: '/results',
      params: {
        operation: 'addition',
      },
    });
    expect(result.current.recentResultItems[0]?.lessonHref).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'adding',
      },
    });
    expect(result.current.assignmentItems[0]?.href).toBe('/lessons');
    expect(result.current.scoreError).toBeNull();

    await act(async () => {
      await result.current.refresh();
    });

    expect(profileRefreshMock).toHaveBeenCalledTimes(1);
    expect(resultsRefreshMock).toHaveBeenCalledTimes(1);
    expect(focusRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces auth restoration through the daily-plan loading state', () => {
    useKangurMobileLearnerProfileMock.mockReturnValue({
      assignments: [],
      authError: null,
      authMode: 'learner-session',
      displayName: 'Ada Learner',
      getActionHref: vi.fn(() => null),
      isAuthenticated: false,
      isLoadingAuth: true,
      isLoadingScores: true,
      masteryInsights: null,
      recommendationsNote: '',
      refreshScores: profileRefreshMock,
      scoresError: null,
      signIn: signInMock,
      snapshot: null,
      supportsLearnerCredentials: true,
    });
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: true,
      isRestoringAuth: true,
      refresh: resultsRefreshMock,
      results: [],
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: true,
      isRestoringAuth: true,
      refresh: focusRefreshMock,
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });

    const { result } = renderHook(() => useKangurMobileDailyPlan());

    expect(result.current.isLoadingAuth).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
