import { AiPathRunRecord } from '@/shared/types/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/types/chatbot';

export async function getAgentRuns(): Promise<AiPathRunRecord[]> {
  const res = await fetch('/api/agentcreator/agent');
  if (!res.ok) throw new Error('Failed to load agent runs.');
  const data = (await res.json()) as { runs?: AiPathRunRecord[] };
  return data.runs ?? [];
}

export async function getAgentSnapshots(runId: string): Promise<AgentSnapshot[]> {
  const res = await fetch(`/api/agentcreator/agent/${runId}/snapshots`);
  if (!res.ok) throw new Error('Failed to load agent snapshots.');
  const data = (await res.json()) as { snapshots?: AgentSnapshot[] };
  return data.snapshots ?? [];
}

export async function getAgentLogs(runId: string): Promise<AgentBrowserLog[]> {
  const res = await fetch(`/api/agentcreator/agent/${runId}/logs`);
  if (!res.ok) throw new Error('Failed to load agent logs.');
  const data = (await res.json()) as { logs?: AgentBrowserLog[] };
  return data.logs ?? [];
}

export async function getAgentAudits(runId: string): Promise<AgentAuditLog[]> {
  const res = await fetch(`/api/agentcreator/agent/${runId}/audits`);
  if (!res.ok) throw new Error('Failed to load agent steps.');
  const data = (await res.json()) as { audits?: AgentAuditLog[] };
  return data.audits ?? [];
}

export async function deleteAgentRun(runId: string, force: boolean = false): Promise<void> {
  const url = force
    ? `/api/agentcreator/agent/${runId}?force=true`
    : `/api/agentcreator/agent/${runId}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error || 'Failed to delete agent run.');
  }
}

export async function deleteCompletedAgentRuns(): Promise<void> {
  const res = await fetch('/api/agentcreator/agent?scope=terminal', {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error || 'Failed to delete agent runs.');
  }
}
