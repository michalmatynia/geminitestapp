import type {
  AgentAuditLogRecordDto as AgentAuditLogRecord,
  AgentAuditLogRecordsResponse,
  AgentBrowserLogRecordDto as AgentBrowserLogRecord,
  AgentBrowserLogsResponse,
  AgentBrowserSnapshotRecordDto as AgentBrowserSnapshotRecord,
  AgentBrowserSnapshotsResponse,
  AgentRunDeleteResponse,
  AgentRunRecord,
  AgentRunsDeleteResponse,
  AgentRunsResponse,
} from '@/shared/contracts/agent-runtime';
import { api } from '@/shared/lib/api-client';

export async function getAgentRuns(): Promise<AgentRunRecord[]> {
  const data = await api.get<AgentRunsResponse>('/api/agentcreator/agent');
  return data.runs;
}

export async function getAgentSnapshots(runId: string): Promise<AgentBrowserSnapshotRecord[]> {
  const data = await api.get<AgentBrowserSnapshotsResponse>(
    `/api/agentcreator/agent/${runId}/snapshots`
  );
  return data.snapshots;
}

export async function getAgentLogs(runId: string): Promise<AgentBrowserLogRecord[]> {
  const data = await api.get<AgentBrowserLogsResponse>(`/api/agentcreator/agent/${runId}/logs`);
  return data.logs;
}

export async function getAgentAudits(runId: string): Promise<AgentAuditLogRecord[]> {
  const data = await api.get<AgentAuditLogRecordsResponse>(
    `/api/agentcreator/agent/${runId}/audits`
  );
  return data.audits;
}

export async function deleteAgentRun(runId: string, force: boolean = false): Promise<void> {
  const options: Parameters<typeof api.delete>[1] = {};
  if (force) options.params = { force: 'true' };
  await api.delete<AgentRunDeleteResponse>(`/api/agentcreator/agent/${runId}`, options);
}

export async function deleteCompletedAgentRuns(): Promise<void> {
  await api.delete<AgentRunsDeleteResponse>('/api/agentcreator/agent', {
    params: { scope: 'terminal' },
  });
}
