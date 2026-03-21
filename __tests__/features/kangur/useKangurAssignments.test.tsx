/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_PROGRESS_EVENT_NAME } from '@/features/kangur/ui/services/progress';

const {
  assignmentsListMock,
  assignmentsCreateMock,
  assignmentsUpdateMock,
  assignmentsReassignMock,
} = vi.hoisted(() => ({
  assignmentsListMock: vi.fn(),
  assignmentsCreateMock: vi.fn(),
  assignmentsUpdateMock: vi.fn(),
  assignmentsReassignMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    assignments: {
      list: assignmentsListMock,
      create: assignmentsCreateMock,
      update: assignmentsUpdateMock,
      reassign: assignmentsReassignMock,
    },
  }),
}));

import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';

const createAssignmentSnapshot = (id: string, percent = 0) => ({
  id,
  learnerKey: 'jan@example.com',
  title: `Zadanie ${id}`,
  description: 'Przydzielone zadanie.',
  priority: 'medium' as const,
  archived: false,
  target: {
    type: 'lesson' as const,
    lessonComponentId: 'division' as const,
    requiredCompletions: 1,
    baselineCompletions: 0,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  progress: {
    status: percent === 100 ? ('completed' as const) : ('not_started' as const),
    percent,
    summary: `Powtórki po przydziale: ${percent === 100 ? 1 : 0}/1.`,
    attemptsCompleted: percent === 100 ? 1 : 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: percent === 100 ? '2026-03-06T11:00:00.000Z' : null,
  },
});

describe('useKangurAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignmentsCreateMock.mockReset();
    assignmentsUpdateMock.mockReset();
  });

  it('refreshes assignments when Kangur progress changes', async () => {
    const initialAssignments = [createAssignmentSnapshot('assignment-1', 0)];
    const refreshedAssignments = [createAssignmentSnapshot('assignment-1', 100)];
    assignmentsListMock
      .mockResolvedValueOnce(initialAssignments)
      .mockResolvedValueOnce(refreshedAssignments);

    const { result } = renderHook(() => useKangurAssignments({ enabled: true }));

    await waitFor(() => {
      expect(result.current.assignments).toEqual(initialAssignments);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(KANGUR_PROGRESS_EVENT_NAME));
    });

    await waitFor(() => {
      expect(assignmentsListMock).toHaveBeenCalledTimes(2);
      expect(result.current.assignments).toEqual(refreshedAssignments);
    });
  });

  it('revalidates assignments when the window regains focus', async () => {
    const initialAssignments = [createAssignmentSnapshot('assignment-2', 0)];
    const refreshedAssignments = [createAssignmentSnapshot('assignment-2', 100)];
    assignmentsListMock
      .mockResolvedValueOnce(initialAssignments)
      .mockResolvedValueOnce(refreshedAssignments);

    const { result } = renderHook(() => useKangurAssignments({ enabled: true }));

    await waitFor(() => {
      expect(result.current.assignments).toEqual(initialAssignments);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(assignmentsListMock).toHaveBeenCalledTimes(2);
      expect(result.current.assignments).toEqual(refreshedAssignments);
    });
  });

  it('does not subscribe to revalidation events when disabled', async () => {
    const { result } = renderHook(() => useKangurAssignments({ enabled: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(KANGUR_PROGRESS_EVENT_NAME));
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(assignmentsListMock).not.toHaveBeenCalled();
      expect(result.current.assignments).toEqual([]);
    });
  });
});
