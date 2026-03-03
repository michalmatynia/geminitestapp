'use client';

import {
  AGENT_PERSONA_SETTINGS_KEY,
  DEFAULT_AGENT_PERSONA_SETTINGS,
} from '@/features/ai/agentcreator/constants/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import { type AgentPersona, type AgentPersonaSettings } from '@/shared/contracts/agents';

export const createAgentPersonaId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `agent-persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const buildAgentPersonaSettings = (
  settings?: Partial<AgentPersonaSettings> | null
): AgentPersonaSettings => ({
  ...DEFAULT_AGENT_PERSONA_SETTINGS,
  ...(settings ?? {}),
});

const toCanonicalAgentPersonaSettings = (value: unknown): AgentPersonaSettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return buildAgentPersonaSettings();
  }

  const raw = value as Record<string, unknown>;
  const next: Partial<AgentPersonaSettings> = {};
  if (typeof raw['personaId'] === 'string') {
    next.personaId = raw['personaId'];
  }
  if (typeof raw['customInstructions'] === 'string') {
    next.customInstructions = raw['customInstructions'];
  }
  return buildAgentPersonaSettings(next);
};

export const normalizeAgentPersonas = (value: unknown): AgentPersona[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): AgentPersona | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as AgentPersona;
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) return null;

      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : createAgentPersonaId();
      const createdAt =
        typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
      const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;
      const settings = toCanonicalAgentPersonaSettings(raw.settings);
      const description = typeof raw.description === 'string' ? raw.description : null;

      return {
        id,
        name,
        description,
        settings,
        createdAt,
        updatedAt,
      } as AgentPersona;
    })
    .filter((item: AgentPersona | null): item is AgentPersona => Boolean(item));
};

const parseStoredAgentPersonas = (rawValue: string | undefined): unknown[] => {
  if (!rawValue?.trim()) return [];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const data = await fetchSettingsCached({ scope: 'heavy' });
  const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
  const stored = parseStoredAgentPersonas(map.get(AGENT_PERSONA_SETTINGS_KEY));
  return normalizeAgentPersonas(stored);
};
