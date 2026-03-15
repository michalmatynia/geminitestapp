'use client';

import { useCallback, useEffect, useState } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { KANGUR_PROGRESS_EVENT_NAME } from '@/features/kangur/ui/services/progress';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const kangurPlatform = getKangurPlatform();

type UseKangurAssignmentsOptions = {
  enabled?: boolean;
  query?: KangurAssignmentListQuery;
};

type UseKangurAssignmentsResult = {
  assignments: KangurAssignmentSnapshot[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAssignment: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  updateAssignment: (
    id: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignmentSnapshot>;
  reassignAssignment: (id: string) => Promise<KangurAssignmentSnapshot>;
};

export const useKangurAssignments = (
  options: UseKangurAssignmentsOptions = {}
): UseKangurAssignmentsResult => {
  const enabled = options.enabled ?? true;
  const query = options.query;
  const [assignments, setAssignments] = useState<KangurAssignmentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setAssignments([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextAssignments = await kangurPlatform.assignments.list(query);
      setAssignments(nextAssignments);
    } catch (loadError: unknown) {
      logClientError(loadError);
      if (isKangurAuthStatusError(loadError)) {
        setAssignments([]);
        setError(null);
      } else {
        logKangurClientError(loadError, {
          source: 'useKangurAssignments',
          action: 'refresh',
          includeArchived: query?.includeArchived ?? false,
        });
        setError('Nie udało się pobrać zadań.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, query?.includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      setAssignments([]);
      setError(null);
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleRevalidate = (): void => {
      void refresh();
    };

    window.addEventListener(KANGUR_PROGRESS_EVENT_NAME, handleRevalidate);
    window.addEventListener('focus', handleRevalidate);

    return () => {
      window.removeEventListener(KANGUR_PROGRESS_EVENT_NAME, handleRevalidate);
      window.removeEventListener('focus', handleRevalidate);
    };
  }, [enabled, refresh]);

  const createAssignment = useCallback(
    async (input: KangurAssignmentCreateInput): Promise<KangurAssignmentSnapshot> => {
      const createdAssignment = await kangurPlatform.assignments.create(input);
      setAssignments((prev) => [createdAssignment, ...prev]);
      setError(null);
      return createdAssignment;
    },
    []
  );

  const updateAssignment = useCallback(
    async (id: string, input: KangurAssignmentUpdateInput): Promise<KangurAssignmentSnapshot> => {
      const updatedAssignment = await kangurPlatform.assignments.update(id, input);
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === updatedAssignment.id ? updatedAssignment : assignment
        )
      );
      setError(null);
      return updatedAssignment;
    },
    []
  );

  const reassignAssignment = useCallback(
    async (id: string): Promise<KangurAssignmentSnapshot> => {
      const reassignedAssignment = await kangurPlatform.assignments.reassign(id);
      setAssignments((prev) => [
        reassignedAssignment,
        ...prev.filter((assignment) => assignment.id !== id),
      ]);
      setError(null);
      return reassignedAssignment;
    },
    []
  );

  return {
    assignments: enabled ? assignments : [],
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : null,
    refresh,
    createAssignment,
    updateAssignment,
    reassignAssignment,
  };
};
