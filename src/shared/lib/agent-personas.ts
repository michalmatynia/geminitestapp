import { fetchSettingsCached } from '@/shared/api/settings-client';
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
import { validationError } from '@/shared/errors/app-error';
import { sanitizeSvg } from '@/shared/utils';

type AgentPersonaMoodPreset = {
  id: AgentPersonaMoodId;
  label: string;
  description: string;
};

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

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const getAgentPersonaMoodPreset = (
  moodId: AgentPersonaMoodId
): AgentPersonaMoodPreset => AGENT_PERSONA_MOOD_PRESET_BY_ID.get(moodId)!;

export const buildAgentPersonaMood = (
  moodId: AgentPersonaMoodId,
  overrides?: Partial<AgentPersonaMood> | null
): AgentPersonaMood => {
  const preset = getAgentPersonaMoodPreset(moodId);
  const avatarImageUrl =
    typeof overrides?.avatarImageUrl === 'string' ? overrides.avatarImageUrl.trim() : '';
  const avatarImageFileId =
    typeof overrides?.avatarImageFileId === 'string' ? overrides.avatarImageFileId.trim() : '';

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
  };
};

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

export const collectAgentPersonaAvatarFileIds = (
  persona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => collectAgentPersonaMoodAvatarFileIds(persona?.moods);

export const diffRemovedAgentPersonaAvatarFileIds = (
  previousPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined,
  nextPersona: Pick<AgentPersona, 'moods'> | Partial<AgentPersona> | null | undefined
): string[] => {
  const previousIds = new Set(collectAgentPersonaAvatarFileIds(previousPersona));
  const nextIds = new Set(collectAgentPersonaAvatarFileIds(nextPersona));

  return Array.from(previousIds).filter((fileId) => !nextIds.has(fileId));
};
