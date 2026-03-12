import 'server-only';

import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
} from '@/features/ai/agentcreator/server/persona-memory';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import {
  AGENT_PERSONA_SETTINGS_KEY,
  type AgentPersona,
} from '@/shared/contracts/agents';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { parseJsonSetting } from '@/shared/utils/settings-json';

// ---------------------------------------------------------------------------
// Persona instruction resolution
// ---------------------------------------------------------------------------

export const resolvePersonaInstructions = async (
  agentPersonaId: string | null
): Promise<string> => {
  if (!agentPersonaId) return '';
  try {
    const raw = await readStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY);
    const personas = parseJsonSetting<AgentPersona[]>(raw, []);
    const persona = personas.find((p) => p.id === agentPersonaId);
    if (!persona) return '';
    const parts: string[] = [];
    if (persona.name) parts.push(`You are ${persona.name}.`);
    if (persona.role) parts.push(`Role: ${persona.role}.`);
    if (persona.instructions) parts.push(persona.instructions.trim());
    return parts.join('\n');
  } catch {
    return '';
  }
};

export { buildPersonaChatMemoryContext };

// ---------------------------------------------------------------------------
// Persona session management
// ---------------------------------------------------------------------------

const buildKangurPersonaSessionTitle = (
  learnerId: string,
  personaName: string | null
): string => {
  const label = personaName?.trim() || 'Tutor persona';
  return `Kangur AI Tutor · ${label} · learner:${learnerId}`;
};

export const resolveKangurPersonaSessionId = async (input: {
  learnerId: string;
  personaId: string | null;
  personaName: string | null;
}): Promise<string | null> => {
  if (!input.personaId) {
    return null;
  }

  const title = buildKangurPersonaSessionTitle(input.learnerId, input.personaName);
  const existingSessionId = await chatbotSessionRepository.findSessionIdByPersonaAndTitle(
    title,
    input.personaId
  );

  if (existingSessionId) {
    return existingSessionId;
  }

  const created = await chatbotSessionRepository.create({
    title,
    userId: null,
    personaId: input.personaId,
    messages: [],
    messageCount: 0,
    settings: {
      personaId: input.personaId,
    },
  });

  return created.id;
};

export { persistAgentPersonaExchangeMemory };
