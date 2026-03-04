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

type NormalizeAgentPersonasOptions = {
  stripDeprecatedSnapshotKeys?: boolean;
};

const toCanonicalAgentPersonaSettings = (
  value: unknown,
  options?: NormalizeAgentPersonasOptions
): AgentPersonaSettings => {
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
  const shouldStripDeprecatedKeys = options?.stripDeprecatedSnapshotKeys === true;
  if (deprecatedKeys.length > 0) {
    if (!shouldStripDeprecatedKeys) {
      throw validationError('Agent persona settings contain deprecated AI snapshot keys.', {
        source: 'agent_personas',
        reason: 'deprecated_snapshot_keys',
        keys: deprecatedKeys,
      });
    }
  }
  const sanitizedRaw =
    shouldStripDeprecatedKeys && deprecatedKeys.length > 0
      ? (() => {
        const next = { ...raw };
        deprecatedKeys.forEach((key) => {
          delete next[key];
        });
        return next;
      })()
      : raw;

  const parsedSettings = agentPersonaSettingsSchema.safeParse(sanitizedRaw);
  if (!parsedSettings.success) {
    throw validationError('Invalid agent persona settings payload.', {
      source: 'agent_personas',
      reason: 'invalid_settings_shape',
      issues: parsedSettings.error.flatten(),
    });
  }

  return buildAgentPersonaSettings(parsedSettings.data);
};

export const normalizeAgentPersonas = (
  value: unknown,
  options?: NormalizeAgentPersonasOptions
): AgentPersona[] => {
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
    const shouldStripDeprecatedKeys = options?.stripDeprecatedSnapshotKeys === true;
    if (deprecatedTopLevelKeys.length > 0) {
      if (!shouldStripDeprecatedKeys) {
        throw validationError('Agent persona contains deprecated AI snapshot keys.', {
          source: 'agent_personas',
          reason: 'deprecated_snapshot_keys',
          index,
          keys: deprecatedTopLevelKeys,
        });
      }
    }
    const sanitizedRaw =
      shouldStripDeprecatedKeys && deprecatedTopLevelKeys.length > 0
        ? (() => {
          const next = { ...raw };
          deprecatedTopLevelKeys.forEach((key) => {
            delete next[key];
          });
          return next;
        })()
        : raw;

    const name = typeof sanitizedRaw['name'] === 'string' ? sanitizedRaw['name'].trim() : '';
    if (!name) {
      throw validationError('Agent persona name is required.', {
        source: 'agent_personas',
        reason: 'missing_name',
        index,
      });
    }

    const id =
      typeof sanitizedRaw['id'] === 'string' && sanitizedRaw['id'].trim()
        ? sanitizedRaw['id']
        : createAgentPersonaId();
    const createdAt =
      typeof sanitizedRaw['createdAt'] === 'string'
        ? sanitizedRaw['createdAt']
        : new Date().toISOString();
    const updatedAt = typeof sanitizedRaw['updatedAt'] === 'string' ? sanitizedRaw['updatedAt'] : createdAt;
    const settings = toCanonicalAgentPersonaSettings(sanitizedRaw['settings'], options);
    const description =
      typeof sanitizedRaw['description'] === 'string' ? sanitizedRaw['description'] : null;

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
  return normalizeAgentPersonas(stored, { stripDeprecatedSnapshotKeys: true });
};
