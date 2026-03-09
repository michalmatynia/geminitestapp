import type { AgentPersona } from '@/shared/contracts/agents';
import {
  AGENT_PERSONA_MOOD_PRESETS,
  buildAgentPersonaMood,
  buildAgentPersonaSettings,
  buildDefaultAgentPersonaMoods,
  collectAgentPersonaAvatarFileIds,
  createAgentPersonaId,
  diffRemovedAgentPersonaAvatarFileIds,
  fetchAgentPersonas as fetchCanonicalAgentPersonas,
  getAgentPersonaMoodPreset,
  normalizeAgentPersonas as normalizeCanonicalAgentPersonas,
  resolveAgentPersonaMood,
} from '@/shared/lib/agent-personas';

export {
  AGENT_PERSONA_MOOD_PRESETS,
  buildAgentPersonaMood,
  buildAgentPersonaSettings,
  buildDefaultAgentPersonaMoods,
  collectAgentPersonaAvatarFileIds,
  createAgentPersonaId,
  diffRemovedAgentPersonaAvatarFileIds,
  getAgentPersonaMoodPreset,
  resolveAgentPersonaMood,
};

export const normalizeAgentPersonas = (value: unknown): AgentPersona[] => {
  // Canonical validation lives in the shared implementation:
  // Agent persona settings payload includes unsupported keys:
  return normalizeCanonicalAgentPersonas(value);
};

export const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const stored = await fetchCanonicalAgentPersonas();
  return normalizeAgentPersonas(stored);
};
