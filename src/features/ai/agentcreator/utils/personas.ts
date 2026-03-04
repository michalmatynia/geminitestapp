import {
  AGENT_PERSONA_SETTINGS_KEY,
  DEFAULT_AGENT_PERSONA_SETTINGS,
} from '@/features/ai/agentcreator/constants/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import { validationError } from '@/shared/errors/app-error';
import {
  agentPersonaSettingsSchema,
  type AgentPersona,
  type AgentPersonaSettings,
} from '@/shared/contracts/agents';

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

const DEPRECATED_AGENT_PERSONA_SETTINGS_KEYS = [
  'executorModel',
  'plannerModel',
  'selfCheckModel',
  'extractionValidationModel',
  'toolRouterModel',
  'memoryValidationModel',
  'memorySummarizationModel',
  'loopGuardModel',
  'approvalGateModel',
  'selectorInferenceModel',
  'outputNormalizationModel',
  'modelId',
  'temperature',
  'maxTokens',
] as const;

const DEPRECATED_AGENT_PERSONA_TOP_LEVEL_KEYS = ['modelId', 'temperature', 'maxTokens'] as const;

const toCanonicalAgentPersonaSettings = (value: unknown): AgentPersonaSettings => {
  if (value === undefined || value === null) {
    return buildAgentPersonaSettings();
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('Invalid agent persona settings payload.', {
      source: 'agent_personas',
      reason: 'invalid_settings_shape',
    });
  }

  const raw = value as Record<string, unknown>;
  const deprecatedKeys = DEPRECATED_AGENT_PERSONA_SETTINGS_KEYS.filter((key: string): boolean =>
    Object.prototype.hasOwnProperty.call(raw, key)
  );
  if (deprecatedKeys.length > 0) {
    throw validationError('Agent persona settings contain deprecated AI snapshot keys.', {
      source: 'agent_personas',
      reason: 'deprecated_snapshot_keys',
      keys: deprecatedKeys,
    });
  }

  const parsedSettings = agentPersonaSettingsSchema.safeParse(raw);
  if (!parsedSettings.success) {
    throw validationError('Invalid agent persona settings payload.', {
      source: 'agent_personas',
      reason: 'invalid_settings_shape',
      issues: parsedSettings.error.flatten(),
    });
  }

  return buildAgentPersonaSettings(parsedSettings.data);
};

export const normalizeAgentPersonas = (value: unknown): AgentPersona[] => {
  if (!Array.isArray(value)) {
    throw validationError('Invalid agent personas payload.', {
      source: 'agent_personas',
      reason: 'payload_not_array',
    });
  }

  return value.map((item: unknown, index: number): AgentPersona => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw validationError('Invalid agent persona payload.', {
        source: 'agent_personas',
        reason: 'persona_not_object',
        index,
      });
    }

    const raw = item as Record<string, unknown>;
    const deprecatedTopLevelKeys = DEPRECATED_AGENT_PERSONA_TOP_LEVEL_KEYS.filter(
      (key: string): boolean => Object.prototype.hasOwnProperty.call(raw, key)
    );
    if (deprecatedTopLevelKeys.length > 0) {
      throw validationError('Agent persona contains deprecated AI snapshot keys.', {
        source: 'agent_personas',
        reason: 'deprecated_snapshot_keys',
        index,
        keys: deprecatedTopLevelKeys,
      });
    }

    const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
    if (!name) {
      throw validationError('Agent persona name is required.', {
        source: 'agent_personas',
        reason: 'missing_name',
        index,
      });
    }

    const id =
      typeof raw['id'] === 'string' && raw['id'].trim() ? raw['id'] : createAgentPersonaId();
    const createdAt =
      typeof raw['createdAt'] === 'string' ? raw['createdAt'] : new Date().toISOString();
    const updatedAt = typeof raw['updatedAt'] === 'string' ? raw['updatedAt'] : createdAt;
    const settings = toCanonicalAgentPersonaSettings(raw['settings']);
    const description = typeof raw['description'] === 'string' ? raw['description'] : null;

    return {
      id,
      name,
      description,
      settings,
      createdAt,
      updatedAt,
    } as AgentPersona;
  });
};

const parseStoredAgentPersonas = (rawValue: string | undefined): unknown[] => {
  if (!rawValue?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    throw validationError('Invalid agent personas payload.', {
      source: 'agent_personas',
      reason: 'invalid_json',
    });
  }
  if (!Array.isArray(parsed)) {
    throw validationError('Invalid agent personas payload.', {
      source: 'agent_personas',
      reason: 'payload_not_array',
    });
  }
  return parsed;
};

export const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const data = await fetchSettingsCached({ scope: 'heavy' });
  const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
  const stored = parseStoredAgentPersonas(map.get(AGENT_PERSONA_SETTINGS_KEY));
  return normalizeAgentPersonas(stored);
};
