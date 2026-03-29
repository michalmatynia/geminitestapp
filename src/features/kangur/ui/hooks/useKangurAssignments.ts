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

const ASSIGNMENTS_STALE_TIME_MS = 1000 * 60 * 2;

type KangurAssignmentsQueryKey = ReturnType<typeof QUERY_KEYS.kangur.assignments>;
type KangurAssignmentsQueryClient = ReturnType<typeof useQueryClient>;

const resolveKangurAssignmentsEnabled = (
  options: UseKangurAssignmentsOptions
): boolean => options.enabled ?? true;

const resolveKangurAssignmentsQuery = (
  options: UseKangurAssignmentsOptions
): KangurAssignmentListQuery | undefined => options.query;

const resolveKangurAssignmentsQueryKey = (
  query?: KangurAssignmentListQuery
): KangurAssignmentsQueryKey =>
  QUERY_KEYS.kangur.assignments({ includeArchived: query?.includeArchived });

const shouldRetryKangurAssignmentsQuery = (
  failureCount: number,
  error: Error
): boolean => !isKangurAuthStatusError(error) && failureCount < 1;

const resolveKangurAssignmentsErrorMessage = (error: Error | null | undefined): string | null =>
  error && !isKangurAuthStatusError(error) ? 'Nie udało się pobrać zadań.' : null;

const invalidateKangurAssignmentsQuery = (
  queryClient: KangurAssignmentsQueryClient,
  queryKey: KangurAssignmentsQueryKey
): Promise<void> =>
  queryClient.invalidateQueries({ queryKey });

const shouldRevalidateKangurAssignmentsOnFocus = (
  queryClient: KangurAssignmentsQueryClient,
  queryKey: KangurAssignmentsQueryKey
): boolean => {
  const queryState = queryClient.getQueryState<KangurAssignmentSnapshot[]>(queryKey);
  const dataUpdatedAt = queryState?.dataUpdatedAt ?? 0;
  if (dataUpdatedAt <= 0) {
    return true;
  }
  return Date.now() - dataUpdatedAt >= ASSIGNMENTS_STALE_TIME_MS;
};

const resolveKangurAssignmentsResult = ({
  assignmentsQuery,
  enabled,
  errorMessage,
  refresh,
  createAssignment,
  updateAssignment,
  reassignAssignment,
}: {
  assignmentsQuery: ReturnType<typeof useQuery<KangurAssignmentSnapshot[], Error>>;
  enabled: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  createAssignment: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  updateAssignment: (
    id: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignmentSnapshot>;
  reassignAssignment: (id: string) => Promise<KangurAssignmentSnapshot>;
}): UseKangurAssignmentsResult => ({
  assignments: enabled ? (assignmentsQuery.data ?? []) : [],
  isLoading: enabled ? assignmentsQuery.isLoading : false,
  error: enabled ? errorMessage : null,
  refresh,
  createAssignment,
  updateAssignment,
  reassignAssignment,
});

const useKangurAssignmentsWindowRevalidation = ({
  enabled,
  queryClient,
  queryKey,
}: {
  enabled: boolean;
  queryClient: KangurAssignmentsQueryClient;
  queryKey: KangurAssignmentsQueryKey;
}): void => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleProgressRevalidate = (): void => {
      void invalidateKangurAssignmentsQuery(queryClient, queryKey);
    };
    const handleFocusRevalidate = (): void => {
      if (!shouldRevalidateKangurAssignmentsOnFocus(queryClient, queryKey)) {
        return;
      }
      void invalidateKangurAssignmentsQuery(queryClient, queryKey);
    };

    window.addEventListener(KANGUR_PROGRESS_EVENT_NAME, handleProgressRevalidate);
    window.addEventListener('focus', handleFocusRevalidate);
    return () => {
      window.removeEventListener(KANGUR_PROGRESS_EVENT_NAME, handleProgressRevalidate);
      window.removeEventListener('focus', handleFocusRevalidate);
    };
  }, [enabled, queryClient, queryKey]);
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
  const enabled = resolveKangurAssignmentsEnabled(options);
  const query = resolveKangurAssignmentsQuery(options);
  const queryClient = useQueryClient();
  const queryKey = resolveKangurAssignmentsQueryKey(query);

  const assignmentsQuery = useQuery<KangurAssignmentSnapshot[], Error>({
    queryKey,
    queryFn: () => fetchAssignments(query),
    enabled,
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryKangurAssignmentsQuery,
    meta: {
      source: 'kangur.hooks.useKangurAssignments',
      operation: 'list',
      resource: 'kangur.assignments',
      domain: 'kangur',
      tags: ['kangur', 'assignments'],
      description: 'Loads learner assignments from the Kangur API.',
    },
  });

  const errorMessage = resolveKangurAssignmentsErrorMessage(assignmentsQuery.error);
  useKangurAssignmentsWindowRevalidation({ enabled, queryClient, queryKey });

  const refresh = useCallback(async (): Promise<void> => {
    await invalidateKangurAssignmentsQuery(queryClient, queryKey);
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

  return resolveKangurAssignmentsResult({
    assignmentsQuery,
    enabled,
    errorMessage,
    refresh,
    createAssignment,
    updateAssignment,
    reassignAssignment,
  });
};
