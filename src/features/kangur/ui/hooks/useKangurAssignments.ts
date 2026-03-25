'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { KANGUR_PROGRESS_EVENT_NAME } from '@/features/kangur/ui/services/progress';
import { QUERY_KEYS } from '@/shared/lib/query-keys';


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

const fetchAssignments = async (
  query?: KangurAssignmentListQuery
): Promise<KangurAssignmentSnapshot[]> => {
  const result = await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurAssignments',
      action: 'refresh',
      description: 'Loads learner assignments from the Kangur API.',
      context: {
        includeArchived: query?.includeArchived ?? false,
      },
    }),
    async () => await kangurPlatform.assignments.list(query),
    {
      fallback: null,
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );
  return result ?? [];
};

export const useKangurAssignments = (
  options: UseKangurAssignmentsOptions = {}
): UseKangurAssignmentsResult => {
  const enabled = options.enabled ?? true;
  const query = options.query;
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.kangur.assignments({ includeArchived: query?.includeArchived });

  const assignmentsQuery = useQuery<KangurAssignmentSnapshot[], Error>({
    queryKey,
    queryFn: () => fetchAssignments(query),
    enabled,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (isKangurAuthStatusError(error)) return false;
      return failureCount < 1;
    },
    meta: {
      source: 'kangur.hooks.useKangurAssignments',
      operation: 'list',
      resource: 'kangur.assignments',
      domain: 'kangur',
      tags: ['kangur', 'assignments'],
      description: 'Loads learner assignments from the Kangur API.',
    },
  });

  const errorMessage =
    assignmentsQuery.error && !isKangurAuthStatusError(assignmentsQuery.error)
      ? 'Nie udało się pobrać zadań.'
      : null;

  // Revalidate assignments when progress changes or the learner returns to the tab.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleRevalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey });
    };

    window.addEventListener(KANGUR_PROGRESS_EVENT_NAME, handleRevalidate);
    window.addEventListener('focus', handleRevalidate);

    return () => {
      window.removeEventListener(KANGUR_PROGRESS_EVENT_NAME, handleRevalidate);
      window.removeEventListener('focus', handleRevalidate);
    };
  }, [enabled, queryClient, queryKey]);

  const refresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const createAssignment = useCallback(
    async (input: KangurAssignmentCreateInput): Promise<KangurAssignmentSnapshot> => {
      const createdAssignment = await kangurPlatform.assignments.create(input);
      queryClient.setQueryData<KangurAssignmentSnapshot[]>(queryKey, (prev) =>
        prev ? [createdAssignment, ...prev] : [createdAssignment]
      );
      return createdAssignment;
    },
    [queryClient, queryKey]
  );

  const updateAssignment = useCallback(
    async (id: string, input: KangurAssignmentUpdateInput): Promise<KangurAssignmentSnapshot> => {
      const updatedAssignment = await kangurPlatform.assignments.update(id, input);
      queryClient.setQueryData<KangurAssignmentSnapshot[]>(queryKey, (prev) =>
        prev
          ? prev.map((assignment) =>
              assignment.id === updatedAssignment.id ? updatedAssignment : assignment
            )
          : [updatedAssignment]
      );
      return updatedAssignment;
    },
    [queryClient, queryKey]
  );

  const reassignAssignment = useCallback(
    async (id: string): Promise<KangurAssignmentSnapshot> => {
      const reassignedAssignment = await kangurPlatform.assignments.reassign(id);
      queryClient.setQueryData<KangurAssignmentSnapshot[]>(queryKey, (prev) =>
        prev
          ? [reassignedAssignment, ...prev.filter((assignment) => assignment.id !== id)]
          : [reassignedAssignment]
      );
      return reassignedAssignment;
    },
    [queryClient, queryKey]
  );

  return {
    assignments: enabled ? (assignmentsQuery.data ?? []) : [],
    isLoading: enabled ? assignmentsQuery.isLoading : false,
    error: enabled ? errorMessage : null,
    refresh,
    createAssignment,
    updateAssignment,
    reassignAssignment,
  };
};
