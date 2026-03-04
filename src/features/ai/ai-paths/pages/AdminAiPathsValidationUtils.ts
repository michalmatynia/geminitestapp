import type {
  AiPathsValidationRule,
  PathConfig,
  PathMeta,
  CentralDocsSnapshotSource,
  CentralDocsSnapshotPayload,
  CentralDocsSnapshotResponse,
  CandidateChangeKind,
} from '@/shared/contracts/ai-paths';
import { pathConfigSchema } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine';

export type SettingsRecord = { key: string; value: string };

export type ParsedAiPathsSettings = {
  pathMetas: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
};

export type RuleParseResult =
  | { ok: true; value: AiPathsValidationRule[] }
  | { ok: false; error: string };

export type {
  CentralDocsSnapshotSource,
  CentralDocsSnapshotPayload,
  CentralDocsSnapshotResponse,
  CandidateChangeKind,
};

export const parseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalizeIso = (value: unknown, fallback: string): string => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : fallback;
};

export const parseDocsSourcesText = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split('\n')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0 && !entry.includes(','))
    )
  );

export const serializeDocsSources = (sources: string[]): string =>
  Array.from(
    new Set(
      sources
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0)
    )
  ).join('\n');

export const parseCollectionMapText = (value: string): Record<string, string> => {
  const nextMap: Record<string, string> = {};
  value
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .forEach((line: string) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) return;
      const entity = line.slice(0, separatorIndex).trim();
      const collection = line.slice(separatorIndex + 1).trim();
      if (!entity || !collection) return;
      nextMap[entity] = collection;
    });
  return nextMap;
};

export const serializeCollectionMap = (value: Record<string, string>): string =>
  Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entity, collection]: [string, string]) => `${entity}:${collection}`)
    .join('\n');

export const parseRulesDraft = (value: string): RuleParseResult => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'Validation rules JSON must be an array.' };
    }
    return { ok: true, value: parsed as AiPathsValidationRule[] };
  } catch {
    return { ok: false, error: 'Invalid validation rules JSON.' };
  }
};

export const uniqueStringList = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value: string): string => value.trim())
        .filter((value: string): boolean => value.length > 0)
    )
  );

export const getAssertionIdFromRule = (rule: AiPathsValidationRule): string | null => {
  const value = rule.inference?.assertionId;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getSourceHashFromRule = (rule: AiPathsValidationRule): string | null => {
  const value = rule.inference?.sourceHash;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getCandidateTags = (rule: AiPathsValidationRule): string[] =>
  uniqueStringList(rule.inference?.tags ?? []);

export const parsePathConfig = (pathId: string, raw: unknown): PathConfig => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw validationError('Invalid AI Paths validation path config payload.', {
      source: 'ai_paths.validation',
      reason: 'payload_not_object',
      pathId,
    });
  }
  const result = pathConfigSchema.safeParse(raw);
  if (!result.success) {
    throw validationError('Invalid AI Paths validation path config payload.', {
      source: 'ai_paths.validation',
      reason: 'schema_validation_failed',
      pathId,
      issues: result.error.flatten(),
    });
  }

  const config = result.data;
  if (config.id !== pathId) {
    throw validationError('AI Paths validation path config id does not match its settings key.', {
      source: 'ai_paths.validation',
      reason: 'path_id_mismatch',
      pathId,
      configId: config.id,
    });
  }

  return {
    ...config,
    aiPathsValidation: normalizeAiPathsValidationConfig(config.aiPathsValidation),
  };
};

export const parsePathIndex = (raw: string | undefined): PathMeta[] => {
  if (!raw) return [];
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry: unknown): PathMeta | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const id = normalizeString(record['id']);
      if (!id) return null;
      const fallbackNow = new Date().toISOString();
      const name = normalizeString(record['name']) || `Path ${id.slice(0, 6)}`;
      return {
        id,
        name,
        createdAt: normalizeIso(record['createdAt'], fallbackNow),
        updatedAt: normalizeIso(record['updatedAt'], fallbackNow),
      };
    })
    .filter((entry: PathMeta | null): entry is PathMeta => Boolean(entry));
};

export const parseAiPathsSettings = (records: SettingsRecord[]): ParsedAiPathsSettings => {
  const settingsMap = new Map<string, string>(
    records.map((record: SettingsRecord): [string, string] => [record.key, record.value])
  );
  const configEntries = Array.from(settingsMap.entries()).filter(([key]: [string, string]) =>
    key.startsWith(PATH_CONFIG_PREFIX)
  );

  const parsedConfigById = new Map<string, PathConfig>();
  configEntries.forEach(([key, value]: [string, string]) => {
    const pathId = key.slice(PATH_CONFIG_PREFIX.length).trim();
    if (!pathId) return;
    const parsed = parseJson(value);
    if (parsed === null) {
      throw validationError('Invalid AI Paths validation path config JSON payload.', {
        source: 'ai_paths.validation',
        reason: 'invalid_json',
        pathId,
      });
    }
    const config = parsePathConfig(pathId, parsed);
    parsedConfigById.set(pathId, config);
  });

  const indexMetas = parsePathIndex(settingsMap.get(PATH_INDEX_KEY));
  const metasFromIndex: PathMeta[] = indexMetas
    .filter((meta: PathMeta): boolean => parsedConfigById.has(meta.id))
    .map((meta: PathMeta): PathMeta => {
      const config = parsedConfigById.get(meta.id);
      return {
        ...meta,
        name: config?.name?.trim() || meta.name || `Path ${meta.id.slice(0, 6)}`,
      };
    });

  const pathMetas = [...metasFromIndex].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const pathConfigs = Object.fromEntries(
    Array.from(parsedConfigById.entries()).map(([id, config]: [string, PathConfig]) => [id, config])
  );

  return {
    pathMetas,
    pathConfigs,
  };
};
