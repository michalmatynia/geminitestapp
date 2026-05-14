import 'server-only';

import { buildAgentPersonaSettings, fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import type {
  AgentPersona,
  AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type {
  PersonaMemorySearchResponse,
} from '@/shared/contracts/persona-memory';

import {
  clamp,
  formatMemoryPromptLine,
} from './persona-memory-utils';
import { searchAgentPersonaMemory } from './persona-memory-search';

export {
  persistAgentPersonaExchangeMemory,
  type PersistAgentPersonaExchangeMemoryParams,
} from './persona-memory-persistence';
export {
  searchAgentPersonaMemory,
  type SearchAgentPersonaMemoryParams,
} from './persona-memory-search';

export const buildAgentPersonaMemoryKey = (personaId: string): string => `persona:${personaId}`;

export const getAgentPersonaById = async (personaId: string): Promise<AgentPersona | null> => {
  const personas = await fetchAgentPersonas();
  return personas.find((persona) => persona.id === personaId) ?? null;
};

type BuildPersonaChatMemoryContextParams = {
  personaId: string;
  latestUserMessage?: string | null;
};

function buildMemoryLines(memory: PersonaMemorySearchResponse, limit: number): string[] {
  return memory.items.slice(0, limit).map(formatMemoryPromptLine);
}

function buildPromptSections(persona: AgentPersona, memory: PersonaMemorySearchResponse, memoryLines: string[]): string[] {
  return [
    `Active persona: ${persona.name}${persona.role !== undefined ? ` (${persona.role})` : ''}.`,
    persona.instructions !== undefined ? `Persona instructions: ${persona.instructions}` : null,
    memory.summary.suggestedMoodId !== null ? `Memory-informed mood: ${memory.summary.suggestedMoodId}.` : null,
    memoryLines.length > 0 ? `Relevant persona memory:\n${memoryLines.join('\n')}` : null,
  ].filter((section): section is string => section !== null);
}

export async function buildPersonaChatMemoryContext(
  params: BuildPersonaChatMemoryContextParams
): Promise<{
  persona: AgentPersona;
  memory: PersonaMemorySearchResponse;
  systemPrompt: string;
  suggestedMoodId: AgentPersonaMoodId | null;
}> {
  const persona = await getAgentPersonaById(params.personaId);
  if (persona === null) {
    throw new Error(`Agent persona "${params.personaId}" was not found.`);
  }

  const settings = buildAgentPersonaSettings(persona.settings);
  const memorySettings = settings.memory ?? {};
  const limit = clamp(memorySettings.defaultSearchLimit, 1, 12, 6);
  const latestUserMessageRaw = params.latestUserMessage;
  const latestUserMessage = latestUserMessageRaw !== null && latestUserMessageRaw !== undefined ? latestUserMessageRaw.trim() : null;

  const memory = memorySettings.enabled === false
    ? {
      items: [],
      summary: {
        personaId: params.personaId,
        suggestedMoodId: null,
        totalRecords: 0,
        memoryEntryCount: 0,
        conversationMessageCount: 0,
      },
    }
    : await searchAgentPersonaMemory({
      personaId: params.personaId,
      q: latestUserMessage,
      limit,
    });

  const memoryLines = buildMemoryLines(memory, limit);
  const promptSections = buildPromptSections(persona, memory, memoryLines);

  return {
    persona,
    memory,
    systemPrompt: promptSections.join('\n\n'),
    suggestedMoodId: memory.summary.suggestedMoodId,
  };
}
