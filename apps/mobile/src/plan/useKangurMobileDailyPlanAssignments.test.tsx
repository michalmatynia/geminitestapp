/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurMobileHomeAssignmentsMock } = vi.hoisted(() => ({
  useKangurMobileHomeAssignmentsMock: vi.fn(),
}));

vi.mock('../home/useKangurMobileHomeAssignments', () => ({
  useKangurMobileHomeAssignments: useKangurMobileHomeAssignmentsMock,
}));

import { useKangurMobileDailyPlanAssignments } from './useKangurMobileDailyPlanAssignments';

describe('useKangurMobileDailyPlanAssignments', () => {
  it('reuses the shared home assignments feed for the daily-plan surface', () => {
    useKangurMobileHomeAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            id: 'assignment-1',
            title: 'Powtórka dodawania',
            description: 'Skup się na najsłabszym obszarze.',
            target: '1 lekcja',
            priority: 'high',
            action: {
              label: 'Otwórz lekcję',
              page: 'Lessons',
            },
          },
          href: '/lessons',
        },
      ],
    });

    const { result } = renderHook(() => useKangurMobileDailyPlanAssignments());

    expect(useKangurMobileHomeAssignmentsMock).toHaveBeenCalledTimes(1);
    expect(result.current.assignmentItems).toEqual([
      {
        assignment: {
          id: 'assignment-1',
          title: 'Powtórka dodawania',
          description: 'Skup się na najsłabszym obszarze.',
          target: '1 lekcja',
          priority: 'high',
          action: {
            label: 'Otwórz lekcję',
            page: 'Lessons',
          },
        },
        href: '/lessons',
      },
    ]);
  });
});
