import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type {
  PersonaMemorySearchResponse,
  PersonaMemorySourceType,
} from '@/shared/contracts/persona-memory';
import { api } from '@/shared/lib/api-client';

export type FetchAgentPersonaMemoryParams = {
  q?: string;
  tag?: string;
  topic?: string;
  mood?: AgentPersonaMoodId | 'all';
  sourceType?: PersonaMemorySourceType | 'all';
  limit?: number;
};

const appendQueryAndTags = (searchParams: URLSearchParams, params: FetchAgentPersonaMemoryParams): void => {
    if (typeof params.q === 'string' && params.q.trim() !== '') searchParams.set('q', params.q.trim());
    if (typeof params.tag === 'string' && params.tag.trim() !== '') searchParams.set('tag', params.tag.trim());
    if (typeof params.topic === 'string' && params.topic.trim() !== '') searchParams.set('topic', params.topic.trim());
};

const appendMetaParams = (searchParams: URLSearchParams, params: FetchAgentPersonaMemoryParams): void => {
    if (params.mood !== undefined && params.mood !== 'all') searchParams.set('mood', params.mood);
    if (params.sourceType !== undefined && params.sourceType !== 'all') searchParams.set('sourceType', params.sourceType);
    if (typeof params.limit === 'number' && params.limit > 0) searchParams.set('limit', String(params.limit));
};

const appendParams = (searchParams: URLSearchParams, params: FetchAgentPersonaMemoryParams): void => {
    appendQueryAndTags(searchParams, params);
    appendMetaParams(searchParams, params);
};

export async function fetchAgentPersonaMemory(
  personaId: string,
  params: FetchAgentPersonaMemoryParams = {}
): Promise<PersonaMemorySearchResponse> {
  const searchParams = new URLSearchParams();
  appendParams(searchParams, params);

  const query = searchParams.toString();
  const endpoint = query !== ''
    ? `/api/agentcreator/personas/${personaId}/memory?${query}`
    : `/api/agentcreator/personas/${personaId}/memory`;

  return api.get<PersonaMemorySearchResponse>(endpoint);
}
