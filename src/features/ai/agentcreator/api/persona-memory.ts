import type {
  PersonaMemorySearchResponse,
  PersonaMemorySourceType,
} from '@/shared/contracts/persona-memory';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import { api } from '@/shared/lib/api-client';

export type FetchAgentPersonaMemoryParams = {
  q?: string;
  tag?: string;
  topic?: string;
  mood?: AgentPersonaMoodId | 'all';
  sourceType?: PersonaMemorySourceType | 'all';
  limit?: number;
};

export async function fetchAgentPersonaMemory(
  personaId: string,
  params: FetchAgentPersonaMemoryParams = {}
): Promise<PersonaMemorySearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set('q', params.q.trim());
  if (params.tag?.trim()) searchParams.set('tag', params.tag.trim());
  if (params.topic?.trim()) searchParams.set('topic', params.topic.trim());
  if (params.mood && params.mood !== 'all') searchParams.set('mood', params.mood);
  if (params.sourceType && params.sourceType !== 'all') {
    searchParams.set('sourceType', params.sourceType);
  }
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query
    ? `/api/agentcreator/personas/${personaId}/memory?${query}`
    : `/api/agentcreator/personas/${personaId}/memory`;

  return api.get<PersonaMemorySearchResponse>(endpoint);
}
