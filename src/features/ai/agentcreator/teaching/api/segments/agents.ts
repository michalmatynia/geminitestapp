import type {
  AgentTeachingAgentDto as AgentTeachingAgentRecord,
  AgentTeachingAgentResponse,
  AgentTeachingAgentsResponse,
} from '@/shared/contracts/agent-teaching';
import { api } from '@/shared/lib/api-client';

/**
 * List all teaching agents
 */
export async function getTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  const data = await api.get<AgentTeachingAgentsResponse>('/api/agentcreator/teaching/agents');
  return data.agents;
}

/**
 * Upsert a teaching agent (create or update)
 */
export async function upsertTeachingAgent(
  payload: Partial<AgentTeachingAgentRecord> & { name: string }
): Promise<AgentTeachingAgentRecord> {
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (id !== '') {
    const data = await api.patch<AgentTeachingAgentResponse>(
      `/api/agentcreator/teaching/agents/${id}`,
      payload
    );
    return data.agent;
  }
  const data = await api.post<AgentTeachingAgentResponse>('/api/agentcreator/teaching/agents', payload);
  return data.agent;
}

/**
 * Delete a teaching agent
 */
export async function deleteTeachingAgent(id: string): Promise<void> {
  await api.delete(`/api/agentcreator/teaching/agents/${id}`);
}
