import type {
  AgentAuditLogRecordDto as AgentAuditLogRecord,
  AgentBrowserLogRecordDto as AgentBrowserLogRecord,
  AgentBrowserSnapshotRecordDto as AgentBrowserSnapshotRecord,
  AgentRunRecord,
} from '@/shared/contracts/agent-runtime';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { agentRunsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/client';

export { agentRunsKeys };

export function useAgentRuns(): ListQuery<AgentRunRecord> {
  const queryKey = agentRunsKeys.lists();
  return useListQueryV2<AgentRunRecord, AgentRunRecord[]>({
    queryKey,
    queryFn: api.getAgentRuns,
    meta: {
      source: 'agentRuns.hooks.useAgentRuns',
      operation: 'list',
      resource: 'agent-runs',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-runs', 'list'],
      description: 'Loads agent runs.',
    },
  });
}

export function useAgentSnapshots(runId: string | null): ListQuery<AgentBrowserSnapshotRecord> {
  const queryKey = agentRunsKeys.snapshots(runId ?? '');
  return useListQueryV2<AgentBrowserSnapshotRecord, AgentBrowserSnapshotRecord[]>({
    queryKey,
    queryFn: () =>
      runId !== null ? api.getAgentSnapshots(runId) : Promise.reject(new Error('runId is null')),
    enabled: runId !== null,
    meta: {
      source: 'agentRuns.hooks.useAgentSnapshots',
      operation: 'list',
      resource: 'agent-runs.snapshots',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-runs', 'snapshots'],
      description: 'Loads agent runs snapshots.',
    },
  });
}

export function useAgentLogs(
  runId: string | null,
  options?: { refetchInterval?: number | false }
): ListQuery<AgentBrowserLogRecord> {
  const queryKey = agentRunsKeys.logs(runId ?? '');
  return useListQueryV2<AgentBrowserLogRecord, AgentBrowserLogRecord[]>({
    queryKey,
    queryFn: () =>
      runId !== null ? api.getAgentLogs(runId) : Promise.reject(new Error('runId is null')),
    enabled: runId !== null,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      source: 'agentRuns.hooks.useAgentLogs',
      operation: 'polling',
      resource: 'agent-runs.logs',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-runs', 'logs'],
      description: 'Polls agent runs logs.',
    },
  });
}

export function useAgentAudits(
  runId: string | null,
  options?: { refetchInterval?: number | false }
): ListQuery<AgentAuditLogRecord> {
  const queryKey = agentRunsKeys.audits(runId ?? '');
  return useListQueryV2<AgentAuditLogRecord, AgentAuditLogRecord[]>({
    queryKey,
    queryFn: () =>
      runId !== null ? api.getAgentAudits(runId) : Promise.reject(new Error('runId is null')),
    enabled: runId !== null,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      source: 'agentRuns.hooks.useAgentAudits',
      operation: 'polling',
      resource: 'agent-runs.audits',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-runs', 'audits'],
      description: 'Polls agent runs audits.',
    },
  });
}
