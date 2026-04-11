import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { isAppError, validationError } from '@/shared/errors/app-error';
import {
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import {
  normalizeLoadedPathMetas,
  sanitizeTriggerPathConfig,
} from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';
import {
  fetchAiPathsSettingsCached,
  fetchAiPathsSettingsByKeysCached,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const TRIGGER_SETTINGS_PRELOAD_TIMEOUT_MS = 8_000;

export const resolveRuntimeStateHint = (value: unknown): RuntimeState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as RuntimeState;
};

export const coerceSampleStateMap = <T>(value: unknown): Record<string, T> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, T>;
};

export const resolvePreferredPathId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildSelectiveTriggerSettingsData = async (
  preferredPathId: string
): Promise<Array<{ key: string; value: string }>> => {
  const preferredConfigKey = `${PATH_CONFIG_PREFIX}${preferredPathId}`;
  const selectiveRecords = await fetchAiPathsSettingsByKeysCached(
    [AI_PATHS_HISTORY_RETENTION_KEY, AI_PATHS_UI_STATE_KEY, preferredConfigKey],
    { timeoutMs: TRIGGER_SETTINGS_PRELOAD_TIMEOUT_MS }
  );
  const configRecord =
    selectiveRecords.find((item: { key: string }) => item.key === preferredConfigKey) ?? null;
  if (!configRecord || typeof configRecord.value !== 'string' || configRecord.value.length === 0) {
    throw validationError(
      `Trigger button is bound to missing AI Path "${preferredPathId}". Update the button configuration.`,
      {
        source: 'ai_paths.trigger_payload',
        reason: 'preferred_path_config_missing',
        preferredPathId,
      }
    );
  }

  let preferredPathName = `Path ${preferredPathId.slice(0, 6)}`;
  try {
    const parsed = JSON.parse(configRecord.value) as { name?: unknown };
    if (typeof parsed?.name === 'string' && parsed.name.trim().length > 0) {
      preferredPathName = parsed.name.trim();
    }
  } catch (error) {
    logClientCatch(error, {
      source: 'useAiPathTriggerEvent',
      action: 'parsePreferredPathConfigName',
      preferredPathId,
    });

    // Keep fallback name when config is malformed.
  }

  const timestamp = new Date().toISOString();
  const syntheticIndex = JSON.stringify([
    {
      id: preferredPathId,
      name: preferredPathName,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]);
  const baseRecords = selectiveRecords.filter(
    (item: { key: string }) => item.key !== PATH_INDEX_KEY && item.key !== preferredConfigKey
  );
  return [
    ...baseRecords,
    { key: PATH_INDEX_KEY, value: syntheticIndex },
    { key: preferredConfigKey, value: configRecord.value },
  ];
};

export const loadTriggerSettingsData = async (args: {
  preferredPathId?: string | null | undefined;
}): Promise<{
  mode: 'selective' | 'full';
  settingsData: Array<{ key: string; value: string }>;
}> => {
  const preferredPathId = resolvePreferredPathId(args.preferredPathId ?? null);
  if (!preferredPathId) {
    return {
      mode: 'full',
      settingsData: await fetchAiPathsSettingsCached(),
    };
  }

  try {
    return {
      mode: 'selective',
      settingsData: await buildSelectiveTriggerSettingsData(preferredPathId),
    };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    logClientCatch(error, {
      source: 'useAiPathTriggerEvent',
      action: 'selectiveSettingsFallback',
      preferredPathId,
    });
    return {
      mode: 'full',
      settingsData: await fetchAiPathsSettingsCached(),
    };
  }
};

export const sanitizeLoadedPathConfig = (config: PathConfig): PathConfig =>
  sanitizeTriggerPathConfig(config);

export const loadPathConfigsFromSettings = async (
  settingsData?: Array<{ key: string; value: string }>
): Promise<{
  configs: Record<string, PathConfig>;
  settingsPathOrder: string[];
}> => {
  const data =
    settingsData ??
    (await (async (): Promise<Array<{ key: string; value: string }> | null> => {
      return await fetchAiPathsSettingsCached();
    })()) ??
    [];
  if (!data.length) return { configs: {}, settingsPathOrder: [] };

  const map = new Map<string, string>(
    data.map((item: { key: string; value: string }) => [item.key, item.value])
  );
  const indexRaw = map.get(PATH_INDEX_KEY);
  if (!indexRaw?.trim()) {
    return { configs: {}, settingsPathOrder: [] };
  }

  let parsedIndex: unknown;
  try {
    parsedIndex = JSON.parse(indexRaw) as unknown;
  } catch (error) {
    logClientCatch(error, {
      source: 'useAiPathTriggerEvent',
      action: 'parseSettingsIndex',
      indexKey: PATH_INDEX_KEY,
    });
    throw validationError('Invalid AI Paths index payload.', {
      source: 'ai_paths.trigger_payload',
      reason: 'index_invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }
  if (!Array.isArray(parsedIndex)) {
    throw validationError('Invalid AI Paths index payload.', {
      source: 'ai_paths.trigger_payload',
      reason: 'index_not_array',
    });
  }

  const metas = parsedIndex.map((meta: unknown, index: number): PathMeta => {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      throw validationError('Invalid AI Paths index entry.', {
        source: 'ai_paths.trigger_payload',
        reason: 'index_entry_not_object',
        index,
      });
    }
    return meta as PathMeta;
  });
  const normalizedMetas = normalizeLoadedPathMetas(metas);
  const configs: Record<string, PathConfig> = {};
  const retainedMetas: PathMeta[] = [];
  let removedMissingConfigEntries = false;

  normalizedMetas.forEach((meta: PathMeta): void => {
    if (!meta?.id) return;
    const configKey = `${PATH_CONFIG_PREFIX}${meta.id}`;
    const configRaw = map.get(configKey);
    if (!configRaw?.trim()) {
      removedMissingConfigEntries = true;
      return;
    }

    const normalizedConfig = loadCanonicalStoredPathConfig({
      pathId: meta.id,
      rawConfig: configRaw,
    });

    configs[meta.id] = normalizedConfig;
    retainedMetas.push(meta);
  });

  const settingsPathOrder = (removedMissingConfigEntries ? retainedMetas : normalizedMetas)
    .map((meta: PathMeta) => meta?.id)
    .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);

  return { configs, settingsPathOrder };
};
