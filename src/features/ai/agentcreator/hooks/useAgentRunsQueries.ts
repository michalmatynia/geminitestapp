import { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/contracts/chatbot';
import type { ListQuery } from '@/shared/contracts/ui';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
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
      domain: 'agent_creator',
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
      domain: 'agent_creator',
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
      domain: 'agent_creator',
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
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-runs', 'audits'],
    },
  });
}
