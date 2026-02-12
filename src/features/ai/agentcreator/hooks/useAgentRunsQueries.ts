import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { invalidateAgentRuns } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/types/domain/chatbot';

import * as api from '../api/client';

export const agentRunsKeys = QUERY_KEYS.agentRuns;

export function useAgentRuns(): UseQueryResult<AiPathRunRecord[], Error> {
  return useQuery({
    queryKey: agentRunsKeys.lists(),
    queryFn: api.getAgentRuns,
  });
}

export function useAgentSnapshots(runId: string | null): UseQueryResult<AgentSnapshot[], Error> {
  return useQuery({
    queryKey: agentRunsKeys.snapshots(runId || ''),
    queryFn: () => api.getAgentSnapshots(runId!),
    enabled: !!runId,
  });
}

export function useAgentLogs(runId: string | null, options?: { refetchInterval?: number }): UseQueryResult<AgentBrowserLog[], Error> {
  return useQuery({
    queryKey: agentRunsKeys.logs(runId || ''),
    queryFn: () => api.getAgentLogs(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval || false,
  });
}

export function useAgentAudits(runId: string | null, options?: { refetchInterval?: number }): UseQueryResult<AgentAuditLog[], Error> {
  return useQuery({
    queryKey: agentRunsKeys.audits(runId || ''),
    queryFn: () => api.getAgentAudits(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval || false,
  });
}

export function useDeleteAgentRunMutation(): UseMutationResult<void, Error, { runId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, force }: { runId: string; force?: boolean }) => 
      api.deleteAgentRun(runId, force),
    onSuccess: () => {
      void invalidateAgentRuns(queryClient);
    },
  });
}

export function useDeleteCompletedAgentRunsMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCompletedAgentRuns,
    onSuccess: () => {
      void invalidateAgentRuns(queryClient);
    },
  });
}
