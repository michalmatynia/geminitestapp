/**
 * Agent Personas Service
 * 
 * Shared service for managing AI agent personas, moods, and settings.
 * Provides:
 * - Persona and mood preset definitions
 * - Canonical persona and setting builders
 * - Persona normalization and validation
 * - Stored persona retrieval and diffing
 * - Avatar and thumbnail management
 */

import { fetchSettingValue } from '@/shared/api/settings-client';
import {
  AGENT_PERSONA_MOOD_IDS,
  AGENT_PERSONA_SETTINGS_KEY,
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  DEFAULT_AGENT_PERSONA_SETTINGS,
  agentPersonaMoodIdSchema,
  agentPersonaSettingsSchema,
  type AgentPersona,
  type AgentPersonaMood,
  type AgentPersonaMoodId,
  type AgentPersonaSettings,
} from '@/shared/contracts/agents';

export type { AgentPersona, AgentPersonaMood, AgentPersonaMoodId, AgentPersonaSettings };
import { validationError } from '@/shared/errors/app-error';
import { sanitizeSvg } from '@/shared/utils/sanitization';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * Metadata for an agent persona mood preset.
 */
type AgentPersonaMoodPreset = {
  /** Unique mood identifier. */
  id: AgentPersonaMoodId;
  /** Human-readable label. */
  label: string;
  /** Description of when the mood should be used. */
  description: string;
};

/**
 * Predefined mood presets for agent personas.
 */
export const AGENT_PERSONA_MOOD_PRESETS: readonly AgentPersonaMoodPreset[] = [
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Default tutor expression when no special state is active.',
  },
  {
    id: 'thinking',
    label: 'Thinking',
    description: 'Shown while the tutor is preparing a response.',
  },
  {
    id: 'encouraging',
    label: 'Encouraging',
    description: 'Shown when the tutor is guiding the learner forward.',
  },
  {
    id: 'happy',
    label: 'Happy',
    description: 'Shown for warm, positive tutor moments.',
  },
  {
    id: 'celebrating',
    label: 'Celebrating',
    description: 'Shown when the learner completes or improves something important.',
  },
];

const AGENT_PERSONA_MOOD_PRESET_BY_ID = new Map<AgentPersonaMoodId, AgentPersonaMoodPreset>(
  AGENT_PERSONA_MOOD_PRESETS.map((preset) => [preset.id, preset])
);

const AGENT_PERSONA_MOOD_ORDER = new Map<AgentPersonaMoodId, number>(
  AGENT_PERSONA_MOOD_IDS.map((moodId, index) => [moodId, index])
);

/**
 * Generates a new unique identifier for an agent persona.
 * Uses crypto.randomUUID if available, otherwise falls back to a custom generator.
 * 
 * @returns A unique persona ID string.
 */
export const createAgentPersonaId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `agent-persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Builds a canonical AgentPersonaSettings object from partial input.
 * Merges provided settings with default agent persona settings.
 * 
 * @param settings - Partial persona settings.
 * @returns A complete AgentPersonaSettings object.
 */
export const buildAgentPersonaSettings = (
  settings?: Partial<AgentPersonaSettings> | null
): AgentPersonaSettings => {
  const resolvedSettings = settings ?? {};
  return {
    ...DEFAULT_AGENT_PERSONA_SETTINGS,
    ...resolvedSettings,
    memory: {
      ...DEFAULT_AGENT_PERSONA_SETTINGS.memory,
      ...(resolvedSettings.memory ?? {}),
    },
  };
};

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Retrieves the preset metadata for a specific mood ID.
 * 
 * @param moodId - The mood identifier.
 * @returns The mood preset metadata.
 */
export const getAgentPersonaMoodPreset = (
  moodId: AgentPersonaMoodId
): AgentPersonaMoodPreset => AGENT_PERSONA_MOOD_PRESET_BY_ID.get(moodId)!;

/**
 * Builds an AgentPersonaMood object for a specific mood ID with optional overrides.
 * 
 * @param moodId - The mood ID.
 * @param overrides - Partial mood properties to override presets.
 * @returns A complete AgentPersonaMood object.
 */
export const buildAgentPersonaMood = (
  moodId: AgentPersonaMoodId,
  overrides?: Partial<AgentPersonaMood> | null
): AgentPersonaMood => {
  const preset = getAgentPersonaMoodPreset(moodId);
  const avatarImageUrl =
    typeof overrides?.avatarImageUrl === 'string' ? overrides.avatarImageUrl.trim() : '';
  const avatarImageFileId =
    typeof overrides?.avatarImageFileId === 'string' ? overrides.avatarImageFileId.trim() : '';
  const avatarThumbnailRef =
    typeof overrides?.avatarThumbnailRef === 'string' ? overrides.avatarThumbnailRef.trim() : '';
  const avatarThumbnailDataUrl =
    typeof overrides?.avatarThumbnailDataUrl === 'string'
      ? overrides.avatarThumbnailDataUrl.trim()
      : '';
  const avatarThumbnailMimeType =
    typeof overrides?.avatarThumbnailMimeType === 'string'
      ? overrides.avatarThumbnailMimeType.trim()
      : '';
  const avatarThumbnailBytes =
    typeof overrides?.avatarThumbnailBytes === 'number' &&
    Number.isFinite(overrides.avatarThumbnailBytes) &&
    overrides.avatarThumbnailBytes >= 0
      ? Math.floor(overrides.avatarThumbnailBytes)
      : null;
  const avatarThumbnailWidth =
    typeof overrides?.avatarThumbnailWidth === 'number' &&
    Number.isFinite(overrides.avatarThumbnailWidth) &&
    overrides.avatarThumbnailWidth > 0
      ? Math.floor(overrides.avatarThumbnailWidth)
      : null;
  const avatarThumbnailHeight =
    typeof overrides?.avatarThumbnailHeight === 'number' &&
    Number.isFinite(overrides.avatarThumbnailHeight) &&
    overrides.avatarThumbnailHeight > 0
      ? Math.floor(overrides.avatarThumbnailHeight)
      : null;
  const hasEmbeddedThumbnailSource = Boolean(avatarThumbnailDataUrl || avatarThumbnailRef);
  const useEmbeddedThumbnail =
    overrides?.useEmbeddedThumbnail === true && hasEmbeddedThumbnailSource;

  return {
    id: moodId,
    label: normalizeOptionalText(overrides?.label) ?? preset.label,
    description: normalizeOptionalText(overrides?.description) ?? preset.description,
    svgContent: sanitizeSvg(
      typeof overrides?.svgContent === 'string' ? overrides.svgContent : '',
      { viewBox: '0 0 100 100' }
    ),
    avatarImageUrl: avatarImageUrl || null,
    avatarImageFileId: avatarImageFileId || null,
    avatarThumbnailRef: avatarThumbnailRef || null,
    avatarThumbnailDataUrl: avatarThumbnailDataUrl || null,
    avatarThumbnailMimeType: avatarThumbnailMimeType || null,
    avatarThumbnailBytes,
    avatarThumbnailWidth,
    avatarThumbnailHeight,
    useEmbeddedThumbnail,
  };
};

/**
 * Builds a list of default agent persona moods.
 * 
 * @param additionalMoodIds - Optional extra mood IDs to include.
 * @returns An array of default AgentPersonaMood objects.
 */
export const buildDefaultAgentPersonaMoods = (
  additionalMoodIds?: AgentPersonaMoodId[] | null
): AgentPersonaMood[] => {
  const seenMoodIds = new Set<AgentPersonaMoodId>([DEFAULT_AGENT_PERSONA_MOOD_ID]);
  const orderedMoodIds: AgentPersonaMoodId[] = [DEFAULT_AGENT_PERSONA_MOOD_ID];

  for (const moodId of additionalMoodIds ?? []) {
    if (seenMoodIds.has(moodId)) {
      continue;
    }

    seenMoodIds.add(moodId);
    orderedMoodIds.push(moodId);
  }

  return orderedMoodIds.map((resolvedMoodId) => buildAgentPersonaMood(resolvedMoodId));
};

/**
 * Resolves the active mood for a persona, falling back to defaults if requested mood is missing.
 * 
 * @param persona - The persona to resolve mood from.
 * @param requestedMoodId - Optional specific mood ID to try and resolve.
 * @returns The resolved AgentPersonaMood.
 */
export const resolveAgentPersonaMood = (
  persona: Pick<AgentPersona, 'moods' | 'defaultMoodId'> | null | undefined,
  requestedMoodId?: AgentPersonaMoodId | null
): AgentPersonaMood => {
  const moods =
    Array.isArray(persona?.moods) && persona.moods.length > 0
      ? persona.moods
      : buildDefaultAgentPersonaMoods();
  const moodById = new Map(moods.map((mood) => [mood.id, mood]));
  const fallbackMoodId =
    persona?.defaultMoodId && moodById.has(persona.defaultMoodId)
      ? persona.defaultMoodId
      : DEFAULT_AGENT_PERSONA_MOOD_ID;

  if (requestedMoodId && moodById.has(requestedMoodId)) {
    return moodById.get(requestedMoodId)!;
  }

  return moodById.get(fallbackMoodId) ?? buildAgentPersonaMood(DEFAULT_AGENT_PERSONA_MOOD_ID);
};

const UNSUPPORTED_AGENT_PERSONA_SETTINGS_KEYS = [
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

const UNSUPPORTED_AGENT_PERSONA_TOP_LEVEL_KEYS = ['modelId', 'temperature', 'maxTokens'] as const;

const parseAgentPersonaMoodId = (
  value: unknown,
  index: number,
  moodIndex: number,
  field: 'id' | 'defaultMoodId'
): AgentPersonaMoodId => {
  const parsedMoodId = agentPersonaMoodIdSchema.safeParse(value);
  if (parsedMoodId.success) {
    return parsedMoodId.data;
  }

  throw validationError('Invalid agent persona mood identifier.', {
    source: 'agent_personas',
    reason: 'invalid_mood_id',
    index,
    moodIndex,
    field,
  });
};

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
  const unsupportedKeys = UNSUPPORTED_AGENT_PERSONA_SETTINGS_KEYS.filter((key: string): boolean =>
    Object.prototype.hasOwnProperty.call(raw, key)
  );
  if (unsupportedKeys.length > 0) {
    throw validationError(
      `Agent persona settings payload includes unsupported keys: ${unsupportedKeys.join(', ')}.`,
      {
        source: 'agent_personas',
        reason: 'unsupported_keys',
        keys: unsupportedKeys,
      }
    );
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

const toCanonicalAgentPersonaMoods = (value: unknown, index: number): AgentPersonaMood[] => {
  if (value === undefined || value === null) {
    return buildDefaultAgentPersonaMoods();
  }

  if (!Array.isArray(value)) {
    throw validationError('Invalid agent persona moods payload.', {
      source: 'agent_personas',
      reason: 'invalid_moods_shape',
      index,
    });
  }

  const moods: AgentPersonaMood[] = [];
  const seenMoodIds = new Set<AgentPersonaMoodId>();

  value.forEach((item: unknown, moodIndex: number) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw validationError('Invalid agent persona mood payload.', {
        source: 'agent_personas',
        reason: 'mood_not_object',
        index,
        moodIndex,
      });
    }

    const rawMood = item as Record<string, unknown>;
    const moodId = parseAgentPersonaMoodId(rawMood['id'], index, moodIndex, 'id');

    if (seenMoodIds.has(moodId)) {
      throw validationError(`Duplicate agent persona mood id "${moodId}".`, {
        source: 'agent_personas',
        reason: 'duplicate_mood_id',
        index,
        moodIndex,
        moodId,
      });
    }

    seenMoodIds.add(moodId);
    moods.push(
      buildAgentPersonaMood(moodId, {
        label: typeof rawMood['label'] === 'string' ? rawMood['label'] : undefined,
        description:
          typeof rawMood['description'] === 'string' ? rawMood['description'] : undefined,
        svgContent: typeof rawMood['svgContent'] === 'string' ? rawMood['svgContent'] : '',
        avatarImageUrl:
          typeof rawMood['avatarImageUrl'] === 'string' ? rawMood['avatarImageUrl'] : null,
        avatarImageFileId:
          typeof rawMood['avatarImageFileId'] === 'string' ? rawMood['avatarImageFileId'] : null,
        avatarThumbnailRef:
          typeof rawMood['avatarThumbnailRef'] === 'string'
            ? rawMood['avatarThumbnailRef']
            : null,
        avatarThumbnailDataUrl:
          typeof rawMood['avatarThumbnailDataUrl'] === 'string'
            ? rawMood['avatarThumbnailDataUrl']
            : null,
        avatarThumbnailMimeType:
          typeof rawMood['avatarThumbnailMimeType'] === 'string'
            ? rawMood['avatarThumbnailMimeType']
            : null,
        avatarThumbnailBytes:
          typeof rawMood['avatarThumbnailBytes'] === 'number'
            ? rawMood['avatarThumbnailBytes']
            : null,
        avatarThumbnailWidth:
          typeof rawMood['avatarThumbnailWidth'] === 'number'
            ? rawMood['avatarThumbnailWidth']
            : null,
        avatarThumbnailHeight:
          typeof rawMood['avatarThumbnailHeight'] === 'number'
            ? rawMood['avatarThumbnailHeight']
            : null,
        useEmbeddedThumbnail: rawMood['useEmbeddedThumbnail'] === true,
      })
    );
  });

  if (!seenMoodIds.has(DEFAULT_AGENT_PERSONA_MOOD_ID)) {
    moods.unshift(buildAgentPersonaMood(DEFAULT_AGENT_PERSONA_MOOD_ID));
  }

  return moods.sort(
    (left, right) =>
      (AGENT_PERSONA_MOOD_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (AGENT_PERSONA_MOOD_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );
};

const toCanonicalAgentPersonaDefaultMoodId = (
  value: unknown,
  _moods: AgentPersonaMood[],
  index: number
): AgentPersonaMoodId => {
  if (value !== undefined && value !== null) {
    parseAgentPersonaMoodId(value, index, -1, 'defaultMoodId');
  }

  return DEFAULT_AGENT_PERSONA_MOOD_ID;
};

const toCanonicalAgentPersonaTools = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tools = value
    .filter((tool): tool is string => typeof tool === 'string')
    .map((tool) => tool.trim())
    .filter(Boolean);

  return tools.length > 0 ? tools : undefined;
};

/**
 * Normalizes and validates an array of raw agent persona objects.
 * 
 * @param value - Raw personas data from storage or API.
 * @returns Array of validated and normalized AgentPersona objects.
 * @throws {AppError} If validation fails.
 */
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
    const unsupportedTopLevelKeys = UNSUPPORTED_AGENT_PERSONA_TOP_LEVEL_KEYS.filter(
      (key: string): boolean => Object.prototype.hasOwnProperty.call(raw, key)
    );
    if (unsupportedTopLevelKeys.length > 0) {
      throw validationError(
        `Agent persona payload includes unsupported keys: ${unsupportedTopLevelKeys.join(', ')}.`,
        {
          source: 'agent_personas',
          reason: 'unsupported_keys',
          index,
          keys: unsupportedTopLevelKeys,
        }
      );
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
    const role = normalizeOptionalText(raw['role']);
    const instructions = normalizeOptionalText(raw['instructions']);
    const tools = toCanonicalAgentPersonaTools(raw['tools']);
    const isDefault = typeof raw['isDefault'] === 'boolean' ? raw['isDefault'] : undefined;
    const moods = toCanonicalAgentPersonaMoods(raw['moods'], index);
    const defaultMoodId = toCanonicalAgentPersonaDefaultMoodId(raw['defaultMoodId'], moods, index);

    return {
      id,
      name,
      description,
      role,
      instructions,
      tools,
      isDefault,
      defaultMoodId,
      moods,
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
  } catch (error) {
    logClientCatch(error, {
      source: 'agent-personas',
      action: 'parseStoredAgentPersonas',
      valueLength: rawValue.length,
    });
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

/**
 * Fetches all agent personas from the global settings storage.
 * 
 * @returns A promise resolving to an array of validated AgentPersona objects.
 */
export const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const rawValue = await fetchSettingValue({
    key: AGENT_PERSONA_SETTINGS_KEY,
    scope: 'heavy',
    bypassCache: true,
  });
  const stored = parseStoredAgentPersonas(rawValue ?? undefined);
  return normalizeAgentPersonas(stored);
};

const collectAgentPersonaMoodAvatarFileIds = (
  moods: AgentPersonaMood[] | null | undefined
): string[] => {
  if (!Array.isArray(moods) || moods.length === 0) return [];
  return Array.from(
    new Set(
      moods
        .map((mood) =>
          typeof mood.avatarImageFileId === 'string' ? mood.avatarImageFileId.trim() : ''
        )
        .filter(Boolean)
    )
  );
};

const collectAgentPersonaMoodAvatarThumbnailRefs = (
  moods: AgentPersonaMood[] | null | undefined
): string[] => {
  if (!Array.isArray(moods) || moods.length === 0) return [];
  return Array.from(
    new Set(
      moods
        .map((mood) =>
          typeof mood.avatarThumbnailRef === 'string' ? mood.avatarThumbnailRef.trim() : ''
        )
        .filter(Boolean)
    )
  );
};

/**
 * Collects all unique avatar file IDs for a persona.
 * 
 * @param persona - The persona to inspect.
 * @returns List of unique file IDs.
 */
export const collectAgentPersonaAvatarFileIds = (
  persona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => collectAgentPersonaMoodAvatarFileIds(persona?.moods);

/**
 * Collects all unique avatar thumbnail references for a persona.
 * 
 * @param persona - The persona to inspect.
 * @returns List of unique thumbnail references.
 */
export const collectAgentPersonaAvatarThumbnailRefs = (
  persona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => collectAgentPersonaMoodAvatarThumbnailRefs(persona?.moods);

/**
 * Identifies avatar file IDs that were removed between two persona states.
 * Useful for cleanup of orphan files.
 * 
 * @param previousPersona - The old persona state.
 * @param nextPersona - The new persona state.
 * @returns List of removed file IDs.
 */
export const diffRemovedAgentPersonaAvatarFileIds = (
  previousPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined,
  nextPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => {
  const previousIds = new Set(collectAgentPersonaAvatarFileIds(previousPersona));
  const nextIds = new Set(collectAgentPersonaAvatarFileIds(nextPersona));

  return Array.from(previousIds).filter((fileId) => !nextIds.has(fileId));
};

/**
 * Identifies avatar thumbnail references that were removed between two persona states.
 * 
 * @param previousPersona - The old persona state.
 * @param nextPersona - The new persona state.
 * @returns List of removed thumbnail references.
 */
export const diffRemovedAgentPersonaAvatarThumbnailRefs = (
  previousPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined,
  nextPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => {
  const previousIds = new Set(collectAgentPersonaAvatarThumbnailRefs(previousPersona));
  const nextIds = new Set(collectAgentPersonaAvatarThumbnailRefs(nextPersona));

  return Array.from(previousIds).filter((ref) => !nextIds.has(ref));
};
