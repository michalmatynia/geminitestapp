'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
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

  const runsQuery = useQuery<RunsResponse>({
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
