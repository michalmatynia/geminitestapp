import { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { AgentSnapshot, AgentBrowserLog, AgentAuditLog } from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

export async function getAgentRuns(): Promise<AiPathRunRecord[]> {
  const data = await api.get<{ runs?: AiPathRunRecord[] }>('/api/agentcreator/agent');
  return data.runs ?? [];
}

export async function getAgentSnapshots(runId: string): Promise<AgentSnapshot[]> {
  const data = await api.get<{ snapshots?: AgentSnapshot[] }>(`/api/agentcreator/agent/${runId}/snapshots`);
  return data.snapshots ?? [];
}

export async function getAgentLogs(runId: string): Promise<AgentBrowserLog[]> {
  const data = await api.get<{ logs?: AgentBrowserLog[] }>(`/api/agentcreator/agent/${runId}/logs`);
  return data.logs ?? [];
}

export async function getAgentAudits(runId: string): Promise<AgentAuditLog[]> {
  const data = await api.get<{ audits?: AgentAuditLog[] }>(`/api/agentcreator/agent/${runId}/audits`);
  return data.audits ?? [];
}

export async function deleteAgentRun(runId: string, force: boolean = false): Promise<void> {
  const options: Parameters<typeof api.delete>[1] = {};
  if (force) options.params = { force: 'true' };
  await api.delete(`/api/agentcreator/agent/${runId}`, options);
}

export async function deleteCompletedAgentRuns(): Promise<void> {
  await api.delete('/api/agentcreator/agent', {
    params: { scope: 'terminal' }
  });
}
