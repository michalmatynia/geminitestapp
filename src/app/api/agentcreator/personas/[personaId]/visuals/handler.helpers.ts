import type { AgentPersona } from '@/shared/contracts/agents';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { normalizeAgentPersonas } from '@/shared/lib/agent-personas';

type AgentPersonaMood = NonNullable<AgentPersona['moods']>[number];

export const resolvePersonaVisualsPersonaId = (personaId: string | undefined): string => {
  const normalizedPersonaId = personaId?.trim();
  if (!normalizedPersonaId) {
    throw badRequestError('Persona id is required.');
  }
  return normalizedPersonaId;
};

export const resolveStoredAgentPersonas = (raw: string | null | undefined): AgentPersona[] =>
  normalizeAgentPersonas(raw?.trim() ? JSON.parse(raw) : []);

export const requireStoredAgentPersona = (
  personas: AgentPersona[],
  personaId: string
): AgentPersona => {
  const persona = personas.find((candidate) => candidate.id === personaId) ?? null;
  if (!persona) {
    throw notFoundError('Agent persona not found.');
  }
  return persona;
};

export const replacePersonaMoods = (
  personas: AgentPersona[],
  personaId: string,
  moods: AgentPersonaMood[]
): AgentPersona[] =>
  personas.map((candidate) => (candidate.id === personaId ? { ...candidate, moods } : candidate));

export const buildPersonaVisualsPayload = (
  persona: AgentPersona,
  moods: AgentPersonaMood[]
): AgentPersona => ({
  ...persona,
  moods,
});
