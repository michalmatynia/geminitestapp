/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listAssignmentsMock,
  createAssignmentMock,
  updateAssignmentMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  listAssignmentsMock: vi.fn(),
  createAssignmentMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    assignments: {
      list: listAssignmentsMock,
      create: createAssignmentMock,
      update: updateAssignmentMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';

const ASSIGNMENT_SNAPSHOT = {
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Powtórz naukę zegara',
  description: 'Skup się na odczytywaniu godzin.',
  priority: 'high' as const,
  archived: false,
  target: {
    type: 'lesson' as const,
    lessonComponentId: 'clock' as const,
    requiredCompletions: 1,
    baselineCompletions: 0,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  progress: {
    status: 'in_progress' as const,
    percent: 40,
    summary: 'Powtórki: 0/1',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
};

describe('useKangurAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAssignmentsMock.mockResolvedValue([ASSIGNMENT_SNAPSHOT]);
    createAssignmentMock.mockResolvedValue(ASSIGNMENT_SNAPSHOT);
    updateAssignmentMock.mockResolvedValue(ASSIGNMENT_SNAPSHOT);
  });

  it('clears loaded assignments immediately when access is disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useKangurAssignments({
          enabled,
          query: {
            includeArchived: false,
          },
        }),
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => {
      expect(result.current.assignments).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.assignments).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(listAssignmentsMock).toHaveBeenCalledTimes(1);
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });
});
