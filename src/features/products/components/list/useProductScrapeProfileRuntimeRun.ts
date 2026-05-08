'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRuntimeSnapshot,
  ProductScrapeProfileRuntimeStatus,
  ProductScrapeProfileRunQueuedResponse,
} from '@/shared/contracts/products/scrape-profiles';
import {
  invalidateListingBadges,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  fetchScrapeProfileRuntimeSnapshot,
  pauseScrapeProfileRuntimeRun,
  refreshProductListQueriesFresh,
  resumeScrapeProfileRuntimeRun,
} from './ProductScrapeProfilesModal.controller.helpers';

const ACTIVE_RUN_STORAGE_KEY = 'products.scrape-profiles.active-run-id.v1';
const RUNTIME_RUN_QUERY_KEY = ['products', 'scrape-profiles', 'runtime-run'] as const;
const ACTIVE_STATUSES = new Set<ProductScrapeProfileRuntimeStatus>([
  'queued',
  'running',
  'paused',
]);

const readStoredActiveRunId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
};

const writeStoredActiveRunId = (runId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, runId);
};

const clearStoredActiveRunId = (runId: string | null): void => {
  if (typeof window === 'undefined') return;
  if (runId === null || window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY) === runId) {
    window.localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
  }
};

export const isProductScrapeProfileRuntimeRunActive = (
  run: ProductScrapeProfileRuntimeRun | null
): run is ProductScrapeProfileRuntimeRun =>
  run !== null && ACTIVE_STATUSES.has(run.status);

export type ProductScrapeProfileRuntimeRunController = {
  activeRun: ProductScrapeProfileRuntimeRun | null;
  isActive: boolean;
  isUpdating: boolean;
  pauseActiveRun: () => void;
  registerQueuedRun: (queuedRun: ProductScrapeProfileRunQueuedResponse) => void;
  resumeActiveRun: () => void;
};

const buildQueuedRuntimeRun = (
  queuedRun: ProductScrapeProfileRunQueuedResponse
): ProductScrapeProfileRuntimeRun =>
  queuedRun.run ?? {
    completedAt: null,
    createdAt: queuedRun.enqueuedAt,
    dryRun: queuedRun.dryRun,
    error: null,
    id: queuedRun.jobId,
    profileId: queuedRun.profileId,
    queueName: queuedRun.queueName,
    result: null,
    startedAt: null,
    status: 'queued',
    updatedAt: queuedRun.enqueuedAt,
  };

const invalidateCompletedImport = async (queryClient: QueryClient): Promise<void> => {
  await invalidateProductsAndCounts(queryClient);
  await Promise.all([
    refreshProductListQueriesFresh(queryClient),
    invalidateListingBadges(queryClient),
  ]);
};

const shouldInvalidateCompletedImportRun = ({
  dryRun,
  invalidatedRunIds,
  runId,
  status,
  trackedRunId,
}: {
  dryRun: boolean;
  invalidatedRunIds: Set<string>;
  runId: string;
  status: string;
  trackedRunId: string | null;
}): boolean =>
  runId === trackedRunId &&
  status === 'completed' &&
  !dryRun &&
  !invalidatedRunIds.has(runId);

const useTrackedRuntimeRunId = (): [
  string | null,
  Dispatch<SetStateAction<string | null>>,
] => {
  const [trackedRunId, setTrackedRunId] = useState<string | null>(null);
  useEffect(() => {
    setTrackedRunId(readStoredActiveRunId());
  }, []);
  return [trackedRunId, setTrackedRunId];
};

const useRuntimeRunQuery = (trackedRunId: string | null): ProductScrapeProfileRuntimeRun | null => {
  const query = useQuery<ProductScrapeProfileRuntimeSnapshot>({
    queryKey: [...RUNTIME_RUN_QUERY_KEY, trackedRunId ?? 'active'],
    queryFn: () => fetchScrapeProfileRuntimeSnapshot(trackedRunId),
    refetchInterval: (queryResult) =>
      isProductScrapeProfileRuntimeRunActive(queryResult.state.data?.run ?? null)
        ? 2_000
        : false,
    retry: false,
    staleTime: 1_000,
  });
  return query.data?.run ?? null;
};

const useRuntimeRunLifecycle = ({
  queryClient,
  run,
  setTrackedRunId,
  trackedRunId,
}: {
  queryClient: QueryClient;
  run: ProductScrapeProfileRuntimeRun | null;
  setTrackedRunId: Dispatch<SetStateAction<string | null>>;
  trackedRunId: string | null;
}): void => {
  const invalidatedCompletedRunsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (run === null) {
      if (trackedRunId !== null) {
        clearStoredActiveRunId(trackedRunId);
        setTrackedRunId(null);
      }
      return;
    }
    const runId = String(run.id);
    const status = String(run.status);
    const dryRun = run.dryRun === true;
    if (isProductScrapeProfileRuntimeRunActive(run)) {
      writeStoredActiveRunId(runId);
      if (runId !== trackedRunId) setTrackedRunId(runId);
      return;
    }
    if (runId === trackedRunId) {
      clearStoredActiveRunId(runId);
      setTrackedRunId(null);
    }
    if (
      !shouldInvalidateCompletedImportRun({
        dryRun,
        invalidatedRunIds: invalidatedCompletedRunsRef.current,
        runId,
        status,
        trackedRunId,
      })
    ) {
      return;
    }
    invalidatedCompletedRunsRef.current.add(runId);
    void invalidateCompletedImport(queryClient).catch(logClientError);
  }, [queryClient, run, setTrackedRunId, trackedRunId]);
};

const useRuntimeRunMutations = (
  rememberRun: (run: ProductScrapeProfileRuntimeRun) => void
): {
  isUpdating: boolean;
  pauseRun: (runId: string) => void;
  resumeRun: (runId: string) => void;
} => {
  const { toast } = useToast();
  const pauseMutation = useMutation({
    mutationFn: pauseScrapeProfileRuntimeRun,
    onSuccess: (response) => {
      rememberRun(response.run);
      toast('Scrape profile run paused.', { variant: 'warning' });
    },
    onError: (error) => {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to pause scrape profile run.', {
        variant: 'error',
      });
    },
  });
  const resumeMutation = useMutation({
    mutationFn: resumeScrapeProfileRuntimeRun,
    onSuccess: (response) => {
      rememberRun(response.run);
      toast('Scrape profile run resumed.', { variant: 'success' });
    },
    onError: (error) => {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to resume scrape profile run.', {
        variant: 'error',
      });
    },
  });
  return {
    isUpdating: pauseMutation.isPending || resumeMutation.isPending,
    pauseRun: pauseMutation.mutate,
    resumeRun: resumeMutation.mutate,
  };
};

export const useProductScrapeProfileRuntimeRun = (): ProductScrapeProfileRuntimeRunController => {
  const queryClient = useQueryClient();
  const [trackedRunId, setTrackedRunId] = useTrackedRuntimeRunId();
  const run = useRuntimeRunQuery(trackedRunId);
  const isActive = isProductScrapeProfileRuntimeRunActive(run);

  useRuntimeRunLifecycle({ queryClient, run, setTrackedRunId, trackedRunId });

  const rememberRun = useCallback(
    (nextRun: ProductScrapeProfileRuntimeRun): void => {
      queryClient.setQueryData<ProductScrapeProfileRuntimeSnapshot>(
        [...RUNTIME_RUN_QUERY_KEY, nextRun.id],
        { run: nextRun }
      );
      setTrackedRunId(nextRun.id);
      writeStoredActiveRunId(nextRun.id);
    },
    [queryClient, setTrackedRunId]
  );
  const { isUpdating, pauseRun, resumeRun } = useRuntimeRunMutations(rememberRun);
  const activeRun = isActive ? run : null;
  const registerQueuedRun = useCallback(
    (queuedRun: ProductScrapeProfileRunQueuedResponse): void => {
      rememberRun(buildQueuedRuntimeRun(queuedRun));
    },
    [rememberRun]
  );
  const pauseActiveRun = useCallback((): void => {
    if (activeRun !== null) pauseRun(activeRun.id);
  }, [activeRun, pauseRun]);
  const resumeActiveRun = useCallback((): void => {
    if (activeRun?.status === 'paused') resumeRun(activeRun.id);
  }, [activeRun, resumeRun]);

  return useMemo(
    () => ({
      activeRun,
      isActive,
      isUpdating,
      pauseActiveRun,
      registerQueuedRun,
      resumeActiveRun,
    }),
    [activeRun, isActive, isUpdating, pauseActiveRun, registerQueuedRun, resumeActiveRun]
  );
};
