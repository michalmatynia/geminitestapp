/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurMobileHomeLessonMasteryMock } = vi.hoisted(() => ({
  useKangurMobileHomeLessonMasteryMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileHomeLessonMastery', () => ({
  useKangurMobileHomeLessonMastery: useKangurMobileHomeLessonMasteryMock,
}));

import { useKangurMobileProfileLessonMastery } from './useKangurMobileProfileLessonMastery';

describe('useKangurMobileProfileLessonMastery', () => {
  it('reuses the shared lesson mastery feed for the profile surface', () => {
    useKangurMobileHomeLessonMasteryMock.mockReturnValue({
      masteredLessons: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 96,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 96,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 94,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
      trackedLessons: 3,
      weakest: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
      lessonsNeedingPractice: 1,
    });

    const { result } = renderHook(() => useKangurMobileProfileLessonMastery());

    expect(useKangurMobileHomeLessonMasteryMock).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({
      masteredLessons: 1,
      trackedLessons: 3,
      lessonsNeedingPractice: 1,
    });
    expect(result.current.strongest[0]?.title).toBe('Zegar');
    expect(result.current.weakest[0]?.title).toBe('Dodawanie');
  });
});
