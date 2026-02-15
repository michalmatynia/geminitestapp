import { useQueryClient } from '@tanstack/react-query';

import { invalidateAgentRuns } from '@/shared/lib/query-invalidation';
import { agentRunsKeys } from '@/shared/lib/query-key-exports';
import { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/types/domain/chatbot';
import {
  createListQuery,
  createCreateMutation,
} from '@/shared/lib/query-factories';
import type { 
  ListQuery, 
  MutationResult
} from '@/shared/types/query-result-types';

import * as api from '../api/client';

export { agentRunsKeys };

export function useAgentRuns(): ListQuery<AiPathRunRecord> {
  return createListQuery<AiPathRunRecord>({
    queryKey: agentRunsKeys.lists(),
    queryFn: api.getAgentRuns,
  });
}

export function useAgentSnapshots(runId: string | null): ListQuery<AgentSnapshot> {
  return createListQuery<AgentSnapshot>({
    queryKey: agentRunsKeys.snapshots(runId || ''),
    queryFn: () => api.getAgentSnapshots(runId!),
    options: {
      enabled: !!runId,
    }
  });
}

export function useAgentLogs(runId: string | null, options?: { refetchInterval?: number | false }): ListQuery<AgentBrowserLog> {
  return createListQuery<AgentBrowserLog>({
    queryKey: agentRunsKeys.logs(runId || ''),
    queryFn: () => api.getAgentLogs(runId!),
    options: {
      enabled: !!runId,
      refetchInterval: options?.refetchInterval ?? false,
    }
  });
}

export function useAgentAudits(runId: string | null, options?: { refetchInterval?: number | false }): ListQuery<AgentAuditLog> {
  return createListQuery<AgentAuditLog>({
    queryKey: agentRunsKeys.audits(runId || ''),
    queryFn: () => api.getAgentAudits(runId!),
    options: {
      enabled: !!runId,
      refetchInterval: options?.refetchInterval ?? false,
    }
  });
}

export function useDeleteAgentRunMutation(): MutationResult<void, { runId: string; force?: boolean }> {
  const queryClient = useQueryClient();
  return createCreateMutation<void, { runId: string; force?: boolean }>({
    mutationFn: ({ runId, force }: { runId: string; force?: boolean }) => 
      api.deleteAgentRun(runId, force),
    options: {
      onSuccess: () => {
        void invalidateAgentRuns(queryClient);
      },
    },
  });
}

export function useDeleteCompletedAgentRunsMutation(): MutationResult<void, void> {
  const queryClient = useQueryClient();
  return createCreateMutation<void, void>({
    mutationFn: api.deleteCompletedAgentRuns,
    options: {
      onSuccess: () => {
        void invalidateAgentRuns(queryClient);
      },
    },
  });
}
