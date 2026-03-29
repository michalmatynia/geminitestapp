'use client';

import { useCallback, useMemo } from 'react';

import { AI_PATHS_LOCAL_RUNS_KEY, parseLocalRuns } from '@/shared/lib/ai-paths';
import type { AiPathLocalRunRecord } from '@/shared/lib/ai-paths';
import {
  useAiPathsSettingsQuery,
  useUpdateAiPathsSettingMutation,
} from '@/shared/lib/ai-paths/hooks/useAiPathQueries';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { shouldIncludeLocalRun } from './local-run-filters';



const TERMINAL_LOCAL_RUN_STATUSES = new Set(['success', 'error']);

export type LocalRunsScope = 'terminal' | 'all';

interface UseLocalRunsOptions {
  sourceFilter?: string | null | undefined;
  sourceMode?: 'include' | 'exclude' | undefined;
}

export function useLocalRuns({ sourceFilter, sourceMode }: UseLocalRunsOptions = {}) {
  const { toast } = useToast();
  const settingsQuery = useAiPathsSettingsQuery();
  const updateMutation = useUpdateAiPathsSettingMutation();

  const rawRuns = useMemo(() => {
    const map = new Map((settingsQuery.data ?? []).map((item) => [item.key, item.value]));
    return map.get(AI_PATHS_LOCAL_RUNS_KEY) ?? null;
  }, [settingsQuery.data]);

  const allRuns = useMemo(() => parseLocalRuns(rawRuns), [rawRuns]);

  const runs = useMemo(() => {
    return allRuns.filter((run: AiPathLocalRunRecord) =>
      shouldIncludeLocalRun(run, sourceFilter, sourceMode)
    );
  }, [allRuns, sourceFilter, sourceMode]);

  const metrics = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((run: AiPathLocalRunRecord) => run.status === 'success').length;
    const error = runs.filter((run: AiPathLocalRunRecord) => run.status === 'error').length;
    const durations = runs
      .map((run: AiPathLocalRunRecord) => run.durationMs)
      .filter((value: number | null | undefined): value is number => Number.isFinite(value));
    const avgDuration = durations.length
      ? Math.round(
        durations.reduce((acc: number, value: number) => acc + value, 0) / durations.length
      )
      : null;
    const p95Duration = durations.length
      ? ([...durations].sort((a: number, b: number) => a - b)[
        Math.max(0, Math.ceil(durations.length * 0.95) - 1)
      ] ?? null)
      : null;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const lastRunAt = runs[0]?.startedAt ?? null;
    return { total, success, error, avgDuration, p95Duration, successRate, lastRunAt };
  }, [runs]);

  const clearRuns = useCallback(
    async (scope: LocalRunsScope): Promise<void> => {
      const nextRuns = allRuns.filter((run: AiPathLocalRunRecord) => {
        const inPanel = shouldIncludeLocalRun(run, sourceFilter, sourceMode);
        if (!inPanel) return true;
        if (scope === 'all') return false;
        return !TERMINAL_LOCAL_RUN_STATUSES.has(run.status);
      });

      try {
        await updateMutation.mutateAsync({
          key: AI_PATHS_LOCAL_RUNS_KEY,
          value: serializeSetting(nextRuns),
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ai-paths:settings:updated', { detail: { scope: 'ai-paths' } })
          );
        }
        toast(
          scope === 'all'
            ? 'Cleared all local runs in this list.'
            : 'Cleared finished local runs in this list.',
          { variant: 'success' }
        );
      } catch (err) {
        logClientError(err);
        toast(err instanceof Error ? err.message : 'Failed to clear local runs.', {
          variant: 'error',
        });
      }
    },
    [allRuns, sourceFilter, sourceMode, toast, updateMutation]
  );

  return {
    runs,
    metrics,
    isLoading: settingsQuery.isLoading,
    isFetching: settingsQuery.isFetching,
    isUpdating: updateMutation.isPending,
    refetch: () => {
      void settingsQuery.refetch();
    },
    clearRuns,
  };
}
