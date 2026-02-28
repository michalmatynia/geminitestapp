import { useQueryClient } from '@tanstack/react-query';

import { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/contracts/chatbot';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { createDeleteMutationV2, createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAgentRuns } from '@/shared/lib/query-invalidation';
import { agentRunsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/client';

export { agentRunsKeys };

export function useAgentRuns(): ListQuery<AiPathRunRecord> {
  const queryKey = agentRunsKeys.lists();
  return createListQueryV2<AiPathRunRecord>({
    queryKey,
    queryFn: api.getAgentRuns,
    meta: {
      source: 'agentRuns.hooks.useAgentRuns',
      operation: 'list',
      resource: 'agent-runs',
      domain: 'global',
      queryKey,
      tags: ['agent-runs', 'list'],
    },
  });
}

export function useAgentSnapshots(runId: string | null): ListQuery<AgentSnapshot> {
  const queryKey = agentRunsKeys.snapshots(runId || '');
  return createListQueryV2<AgentSnapshot>({
    queryKey,
    queryFn: () => api.getAgentSnapshots(runId!),
    enabled: !!runId,
    meta: {
      source: 'agentRuns.hooks.useAgentSnapshots',
      operation: 'list',
      resource: 'agent-runs.snapshots',
      domain: 'global',
      queryKey,
      tags: ['agent-runs', 'snapshots'],
    },
  });
}

export function useAgentLogs(
  runId: string | null,
  options?: { refetchInterval?: number | false }
): ListQuery<AgentBrowserLog> {
  const queryKey = agentRunsKeys.logs(runId || '');
  return createListQueryV2<AgentBrowserLog>({
    queryKey,
    queryFn: () => api.getAgentLogs(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      source: 'agentRuns.hooks.useAgentLogs',
      operation: 'polling',
      resource: 'agent-runs.logs',
      domain: 'global',
      queryKey,
      tags: ['agent-runs', 'logs'],
    },
  });
}

export function useAgentAudits(
  runId: string | null,
  options?: { refetchInterval?: number | false }
): ListQuery<AgentAuditLog> {
  const queryKey = agentRunsKeys.audits(runId || '');
  return createListQueryV2<AgentAuditLog>({
    queryKey,
    queryFn: () => api.getAgentAudits(runId!),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      source: 'agentRuns.hooks.useAgentAudits',
      operation: 'polling',
      resource: 'agent-runs.audits',
      domain: 'global',
      queryKey,
      tags: ['agent-runs', 'audits'],
    },
  });
}

export function useDeleteAgentRunMutation(): MutationResult<
  void,
  { runId: string; force?: boolean }
  > {
  const queryClient = useQueryClient();
  const mutationKey = agentRunsKeys.lists();
  return createDeleteMutationV2<void, { runId: string; force?: boolean }>({
    mutationFn: ({ runId, force }: { runId: string; force?: boolean }) =>
      api.deleteAgentRun(runId, force),
    mutationKey,
    meta: {
      source: 'agentRuns.hooks.useDeleteAgentRunMutation',
      operation: 'delete',
      resource: 'agent-runs',
      domain: 'global',
      mutationKey,
      tags: ['agent-runs', 'delete'],
    },
    onSuccess: () => {
      void invalidateAgentRuns(queryClient);
    },
  });
}

export function useDeleteCompletedAgentRunsMutation(): MutationResult<void, void> {
  const queryClient = useQueryClient();
  const mutationKey = agentRunsKeys.lists();
  return createDeleteMutationV2<void, void>({
    mutationFn: api.deleteCompletedAgentRuns,
    mutationKey,
    meta: {
      source: 'agentRuns.hooks.useDeleteCompletedAgentRunsMutation',
      operation: 'delete',
      resource: 'agent-runs.completed',
      domain: 'global',
      mutationKey,
      tags: ['agent-runs', 'completed', 'delete'],
    },
    onSuccess: () => {
      void invalidateAgentRuns(queryClient);
    },
  });
}
