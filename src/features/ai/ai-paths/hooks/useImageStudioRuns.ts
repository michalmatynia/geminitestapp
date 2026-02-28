'use client';

import { useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline' | null;
  expectedOutputs: number;
  outputs: Array<{ id: string; filepath: string }>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type RunsResponse = {
  runs: ImageStudioRunRecord[];
  total: number;
};

export function useImageStudioRuns() {
  const [statusFilter, setStatusFilter] = useState<'all' | ImageStudioRunStatus>('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const runsQuery = createListQueryV2<RunsResponse, RunsResponse>({
    queryKey: QUERY_KEYS.imageStudio.runs({ status: statusFilter }),
    queryFn: async () => {
      return await api.get<RunsResponse>('/api/image-studio/runs', {
        params: {
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          limit: 100,
          offset: 0,
        },
      });
    },
    refetchInterval: autoRefreshEnabled ? 3000 : false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.hooks.useImageStudioRuns',
      operation: 'list',
      resource: 'image-studio.runs',
      domain: 'image_studio',
      tags: ['image-studio', 'runs'],
    },
  });

  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data]);

  const stats = useMemo(() => {
    const runningCount = runs.filter((run) => run.status === 'running').length;
    const queuedCount = runs.filter((run) => run.status === 'queued').length;
    const total = runsQuery.data?.total ?? 0;
    return { runningCount, queuedCount, total };
  }, [runs, runsQuery.data?.total]);

  return {
    runs,
    stats,
    statusFilter,
    setStatusFilter,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    isLoading: runsQuery.isLoading,
    isFetching: runsQuery.isFetching,
    refetch: () => void runsQuery.refetch(),
  };
}
