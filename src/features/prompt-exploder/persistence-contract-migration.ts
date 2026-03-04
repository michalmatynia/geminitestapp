import {
  PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES,
  PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS,
  PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS,
  PROMPT_EXPLODER_LEGACY_BRIDGE_SOURCE_ALIASES,
  PROMPT_EXPLODER_LEGACY_BRIDGE_TARGET_ALIASES,
  PROMPT_EXPLODER_LEGACY_VALIDATION_STACK_ALIASES,
} from '@/shared/contracts/prompt-exploder';

export const PROMPT_EXPLODER_SETTINGS_STORAGE_KEY = 'prompt_exploder_settings';
export const PROMPT_EXPLODER_SEGMENTATION_LIBRARY_STORAGE_KEY =
  'prompt_exploder_segmentation_library';
export const PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY = 'prompt_exploder:draft_prompt';
export const PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY = 'prompt_exploder:apply_to_studio_prompt';

export const PROMPT_EXPLODER_MIGRATABLE_SETTING_KEYS = [
  PROMPT_EXPLODER_SETTINGS_STORAGE_KEY,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_STORAGE_KEY,
  PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY,
  PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY,
] as const;

export type PromptExploderMigratableSettingKey =
  (typeof PROMPT_EXPLODER_MIGRATABLE_SETTING_KEYS)[number];

export type PromptExploderPersistenceMigrationStatus =
  | 'changed'
  | 'unchanged'
  | 'invalid_json'
  | 'unsupported_shape';

export type PromptExploderPersistenceMigrationStats = {
  stackAliasesNormalized: number;
  scopeAliasesNormalized: number;
  bridgeAliasesNormalized: number;
  bridgeDefaultsApplied: number;
  recordsTouched: number;
};

export type PromptExploderPersistenceMigrationResult = {
  key: string;
  status: PromptExploderPersistenceMigrationStatus;
  changed: boolean;
  value: string;
  nextValue: string | null;
  warnings: string[];
  stats: PromptExploderPersistenceMigrationStats;
};

type BridgeNormalizationResult = {
  value: unknown;
  changed: boolean;
  usedAlias: boolean;
  usedDefault: boolean;
};

const LEGACY_STACK_ALIAS_MAP: Record<string, string> = {
  ...PROMPT_EXPLODER_LEGACY_VALIDATION_STACK_ALIASES,
};
const LEGACY_BRIDGE_SOURCE_ALIAS_MAP: Record<string, string> = {
  ...PROMPT_EXPLODER_LEGACY_BRIDGE_SOURCE_ALIASES,
};
const LEGACY_BRIDGE_TARGET_ALIAS_MAP: Record<string, string> = {
  ...PROMPT_EXPLODER_LEGACY_BRIDGE_TARGET_ALIASES,
};

const CANONICAL_STACK_IDS = new Set<string>(PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS);
const CANONICAL_BRIDGE_SOURCES = new Set<string>(PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES);
const CANONICAL_BRIDGE_TARGETS = new Set<string>(PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS);

const VALIDATION_SCOPE_ALIAS_MAP: Record<string, string> = {
  'prompt-exploder': 'prompt_exploder',
  'case-resolver-prompt-exploder': 'case_resolver_prompt_exploder',
};

const RETURN_TARGET_ALIAS_MAP: Record<string, string> = {
  studio: 'image-studio',
  image_studio: 'image-studio',
  case_resolver: 'case-resolver',
};

const emptyStats = (): PromptExploderPersistenceMigrationStats => ({
  stackAliasesNormalized: 0,
  scopeAliasesNormalized: 0,
  bridgeAliasesNormalized: 0,
  bridgeDefaultsApplied: 0,
  recordsTouched: 0,
});

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toNormalizedToken = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const cloneRecord = (value: Record<string, unknown>): Record<string, unknown> => ({ ...value });

const normalizeValidationRuleStackValue = (
  value: unknown
): {
  value: unknown;
  changed: boolean;
  usedAlias: boolean;
} => {
  if (typeof value === 'string') {
    const token = toNormalizedToken(value);
    if (!token) return { value, changed: false, usedAlias: false };
    const legacy = LEGACY_STACK_ALIAS_MAP[token];
    if (legacy) {
      return { value: legacy, changed: legacy !== value, usedAlias: true };
    }
    if (CANONICAL_STACK_IDS.has(token)) {
      return { value: token, changed: token !== value, usedAlias: false };
    }
    return { value, changed: false, usedAlias: false };
  }

  const record = asObjectRecord(value);
  if (!record) return { value, changed: false, usedAlias: false };
  const idRaw = record['id'];
  if (typeof idRaw !== 'string') return { value, changed: false, usedAlias: false };

  const token = toNormalizedToken(idRaw);
  if (!token) return { value, changed: false, usedAlias: false };
  const legacy = LEGACY_STACK_ALIAS_MAP[token];
  if (legacy) {
    return {
      value: { ...record, id: legacy },
      changed: legacy !== idRaw,
      usedAlias: true,
    };
  }
  if (CANONICAL_STACK_IDS.has(token)) {
    return {
      value: token === idRaw ? value : { ...record, id: token },
      changed: token !== idRaw,
      usedAlias: false,
    };
  }
  return { value, changed: false, usedAlias: false };
};

const normalizeValidationScopeValue = (value: unknown): {
  value: unknown;
  changed: boolean;
  usedAlias: boolean;
} => {
  if (typeof value !== 'string') return { value, changed: false, usedAlias: false };
  const token = toNormalizedToken(value);
  if (!token) return { value, changed: false, usedAlias: false };
  const mapped = VALIDATION_SCOPE_ALIAS_MAP[token];
  if (!mapped) return { value, changed: false, usedAlias: false };
  return {
    value: mapped,
    changed: mapped !== value,
    usedAlias: true,
  };
};

const normalizeReturnTargetValue = (value: unknown): {
  value: unknown;
  changed: boolean;
  usedAlias: boolean;
} => {
  if (typeof value !== 'string') return { value, changed: false, usedAlias: false };
  const token = toNormalizedToken(value);
  if (!token) return { value, changed: false, usedAlias: false };
  const mapped = RETURN_TARGET_ALIAS_MAP[token];
  if (!mapped) return { value, changed: false, usedAlias: false };
  return {
    value: mapped,
    changed: mapped !== value,
    usedAlias: true,
  };
};

const normalizeBridgeSourceValue = (
  value: unknown,
  fallback: string | null
): BridgeNormalizationResult => {
  const token = toNormalizedToken(value);
  if (token) {
    const legacy = LEGACY_BRIDGE_SOURCE_ALIAS_MAP[token];
    if (legacy) {
      return {
        value: legacy,
        changed: legacy !== value,
        usedAlias: true,
        usedDefault: false,
      };
    }
    if (CANONICAL_BRIDGE_SOURCES.has(token)) {
      return {
        value: token,
        changed: token !== value,
        usedAlias: false,
        usedDefault: false,
      };
    }
    return {
      value,
      changed: false,
      usedAlias: false,
      usedDefault: false,
    };
  }
  if (!fallback) {
    return {
      value,
      changed: false,
      usedAlias: false,
      usedDefault: false,
    };
  }
  return {
    value: fallback,
    changed: true,
    usedAlias: false,
    usedDefault: true,
  };
};

const normalizeBridgeTargetValue = (
  value: unknown,
  fallback: string | null
): BridgeNormalizationResult => {
  const token = toNormalizedToken(value);
  if (token) {
    const legacy = LEGACY_BRIDGE_TARGET_ALIAS_MAP[token];
    if (legacy) {
      return {
        value: legacy,
        changed: legacy !== value,
        usedAlias: true,
        usedDefault: false,
      };
    }
    if (CANONICAL_BRIDGE_TARGETS.has(token)) {
      return {
        value: token,
        changed: token !== value,
        usedAlias: false,
        usedDefault: false,
      };
    }
    return {
      value,
      changed: false,
      usedAlias: false,
      usedDefault: false,
    };
  }
  if (!fallback) {
    return {
      value,
      changed: false,
      usedAlias: false,
      usedDefault: false,
    };
  }
  return {
    value: fallback,
    changed: true,
    usedAlias: false,
    usedDefault: true,
  };
};

const parseJsonValue = (
  key: string,
  value: string
): {
  ok: true;
  parsed: unknown;
} | {
  ok: false;
  result: PromptExploderPersistenceMigrationResult;
} => {
  try {
    return { ok: true, parsed: JSON.parse(value) as unknown };
  } catch {
    return {
      ok: false,
      result: {
        key,
        status: 'invalid_json',
        changed: false,
        value,
        nextValue: null,
        warnings: ['Setting value is not valid JSON.'],
        stats: emptyStats(),
      },
    };
  }
};

const migratePromptExploderSettingsValue = (
  key: string,
  value: string
): PromptExploderPersistenceMigrationResult => {
  const parsed = parseJsonValue(key, value);
  if (!parsed.ok) return parsed.result;

  const payload = asObjectRecord(parsed.parsed);
  if (!payload) {
    return {
      key,
      status: 'unsupported_shape',
      changed: false,
      value,
      nextValue: null,
      warnings: ['Settings payload is not an object.'],
      stats: emptyStats(),
    };
  }

  const runtime = asObjectRecord(payload['runtime']);
  if (!runtime) {
    return {
      key,
      status: 'unsupported_shape',
      changed: false,
      value,
      nextValue: null,
      warnings: ['Settings payload has no runtime object.'],
      stats: emptyStats(),
    };
  }

  const stackNormalization = normalizeValidationRuleStackValue(runtime['validationRuleStack']);
  const changed = stackNormalization.changed;
  const stats = emptyStats();
  if (stackNormalization.usedAlias) stats.stackAliasesNormalized += 1;
  if (changed) stats.recordsTouched += 1;

  if (!changed) {
    return {
      key,
      status: 'unchanged',
      changed: false,
      value,
      nextValue: value,
      warnings: [],
      stats,
    };
  }

  const nextRuntime = cloneRecord(runtime);
  nextRuntime['validationRuleStack'] = stackNormalization.value;
  const nextPayload = cloneRecord(payload);
  nextPayload['runtime'] = nextRuntime;

  return {
    key,
    status: 'changed',
    changed: true,
    value,
    nextValue: JSON.stringify(nextPayload),
    warnings: [],
    stats,
  };
};

const migratePromptExploderSegmentationLibraryValue = (
  key: string,
  value: string
): PromptExploderPersistenceMigrationResult => {
  const parsed = parseJsonValue(key, value);
  if (!parsed.ok) return parsed.result;

  const payload = asObjectRecord(parsed.parsed);
  if (!payload) {
    return {
      key,
      status: 'unsupported_shape',
      changed: false,
      value,
      nextValue: null,
      warnings: ['Segmentation library payload is not an object.'],
      stats: emptyStats(),
    };
  }
  const records = payload['records'];
  if (!Array.isArray(records)) {
    return {
      key,
      status: 'unsupported_shape',
      changed: false,
      value,
      nextValue: null,
      warnings: ['Segmentation library payload has no records array.'],
      stats: emptyStats(),
    };
  }

  let changed = false;
  const stats = emptyStats();
  const nextRecords = records.map((recordValue: unknown): unknown => {
    const record = asObjectRecord(recordValue);
    if (!record) return recordValue;
    let recordChanged = false;
    let nextRecord: Record<string, unknown> | null = null;

    const stackNormalization = normalizeValidationRuleStackValue(record['validationRuleStack']);
    if (stackNormalization.changed) {
      nextRecord = nextRecord ?? cloneRecord(record);
      nextRecord['validationRuleStack'] = stackNormalization.value;
      recordChanged = true;
    }
    if (stackNormalization.usedAlias) {
      stats.stackAliasesNormalized += 1;
    }

    const scopeNormalization = normalizeValidationScopeValue(record['validationScope']);
    if (scopeNormalization.changed) {
      nextRecord = nextRecord ?? cloneRecord(record);
      nextRecord['validationScope'] = scopeNormalization.value;
      recordChanged = true;
    }
    if (scopeNormalization.usedAlias) {
      stats.scopeAliasesNormalized += 1;
    }

    const returnTargetNormalization = normalizeReturnTargetValue(record['returnTarget']);
    if (returnTargetNormalization.changed) {
      nextRecord = nextRecord ?? cloneRecord(record);
      nextRecord['returnTarget'] = returnTargetNormalization.value;
      recordChanged = true;
    }
    if (returnTargetNormalization.usedAlias) {
      stats.scopeAliasesNormalized += 1;
    }

    if (recordChanged) {
      changed = true;
      stats.recordsTouched += 1;
      return nextRecord ?? record;
    }
    return recordValue;
  });

  if (!changed) {
    return {
      key,
      status: 'unchanged',
      changed: false,
      value,
      nextValue: value,
      warnings: [],
      stats,
    };
  }

  const nextPayload = cloneRecord(payload);
  nextPayload['records'] = nextRecords;

  return {
    key,
    status: 'changed',
    changed: true,
    value,
    nextValue: JSON.stringify(nextPayload),
    warnings: [],
    stats,
  };
};

const migratePromptExploderBridgePayloadValue = (
  key: string,
  value: string
): PromptExploderPersistenceMigrationResult => {
  const parsed = parseJsonValue(key, value);
  if (!parsed.ok) return parsed.result;

  const payload = asObjectRecord(parsed.parsed);
  if (!payload) {
    return {
      key,
      status: 'unsupported_shape',
      changed: false,
      value,
      nextValue: null,
      warnings: ['Bridge payload is not an object.'],
      stats: emptyStats(),
    };
  }

  const defaultSource =
    key === PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY
      ? 'prompt-exploder'
      : key === PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY
        ? 'image-studio'
        : null;
  const defaultTarget =
    key === PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY
      ? 'image-studio'
      : key === PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY
        ? 'prompt-exploder'
        : null;

  const sourceNormalization = normalizeBridgeSourceValue(payload['source'], defaultSource);
  const targetNormalization = normalizeBridgeTargetValue(payload['target'], defaultTarget);

  const changed = sourceNormalization.changed || targetNormalization.changed;
  const stats = emptyStats();
  if (sourceNormalization.usedAlias) stats.bridgeAliasesNormalized += 1;
  if (targetNormalization.usedAlias) stats.bridgeAliasesNormalized += 1;
  if (sourceNormalization.usedDefault) stats.bridgeDefaultsApplied += 1;
  if (targetNormalization.usedDefault) stats.bridgeDefaultsApplied += 1;
  if (changed) stats.recordsTouched += 1;

  if (!changed) {
    return {
      key,
      status: 'unchanged',
      changed: false,
      value,
      nextValue: value,
      warnings: [],
      stats,
    };
  }

  const nextPayload = cloneRecord(payload);
  nextPayload['source'] = sourceNormalization.value;
  nextPayload['target'] = targetNormalization.value;

  return {
    key,
    status: 'changed',
    changed: true,
    value,
    nextValue: JSON.stringify(nextPayload),
    warnings: [],
    stats,
  };
};

export const migratePromptExploderPersistedSettingValue = (args: {
  key: string;
  value: string;
}): PromptExploderPersistenceMigrationResult => {
  if (args.key === PROMPT_EXPLODER_SETTINGS_STORAGE_KEY) {
    return migratePromptExploderSettingsValue(args.key, args.value);
  }
  if (args.key === PROMPT_EXPLODER_SEGMENTATION_LIBRARY_STORAGE_KEY) {
    return migratePromptExploderSegmentationLibraryValue(args.key, args.value);
  }
  if (
    args.key === PROMPT_EXPLODER_DRAFT_PROMPT_STORAGE_KEY ||
    args.key === PROMPT_EXPLODER_APPLY_PROMPT_STORAGE_KEY
  ) {
    return migratePromptExploderBridgePayloadValue(args.key, args.value);
  }

  return {
    key: args.key,
    status: 'unsupported_shape',
    changed: false,
    value: args.value,
    nextValue: null,
    warnings: ['Setting key is not part of Prompt Exploder persistence migration scope.'],
    stats: emptyStats(),
  };
};
