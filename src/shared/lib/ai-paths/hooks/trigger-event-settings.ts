
import {
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import {
  normalizeLoadedPathName,
  normalizeLoadedPathMetas,
  sanitizeTriggerPathConfig,
} from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';
import { fetchAiPathsSettingsCached, fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { validationError } from '@/shared/errors/app-error';

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
    throw new Error(`Missing preferred path config for ${preferredPathId}.`);
  }

  let preferredPathName = `Path ${preferredPathId.slice(0, 6)}`;
  try {
    const parsed = JSON.parse(configRecord.value) as { name?: unknown };
    if (typeof parsed?.name === 'string' && parsed.name.trim().length > 0) {
      preferredPathName = parsed.name.trim();
    }
  } catch {
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
    logClientError(error, {
      context: {
        source: 'useAiPathTriggerEvent',
        action: 'selectiveSettingsFallback',
        preferredPathId,
      },
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
  const settingsPathOrder = normalizedMetas
    .map((meta: PathMeta) => meta?.id)
    .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);
  const configs: Record<string, PathConfig> = {};

  normalizedMetas.forEach((meta: PathMeta): void => {
    if (!meta?.id) return;
    const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
    if (!configRaw?.trim()) {
      throw validationError('AI Paths index references missing config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'missing_path_config',
        pathId: meta.id,
      });
    }

    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configRaw) as unknown;
    } catch (error) {
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_invalid_json',
        pathId: meta.id,
        cause: error instanceof Error ? error.message : 'unknown_error',
      });
    }
    if (!parsedConfig || typeof parsedConfig !== 'object' || Array.isArray(parsedConfig)) {
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_not_object',
        pathId: meta.id,
      });
    }

    const config = parsedConfig as PathConfig;
    const normalizedConfig = sanitizeLoadedPathConfig(config);
    const normalizedId = typeof normalizedConfig.id === 'string' ? normalizedConfig.id.trim() : '';
    if (!normalizedId || normalizedId !== meta.id) {
      throw validationError('AI Path config id does not match index entry.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_id_mismatch',
        expectedPathId: meta.id,
        actualPathId: normalizedId || null,
      });
    }
    const normalizedName =
      normalizeLoadedPathName(meta.id, normalizedConfig.name) ||
      normalizeLoadedPathName(meta.id, meta.name);
    if (!normalizedName) {
      throw validationError('AI Path config name is required.', {
        source: 'ai_paths.trigger_payload',
        reason: 'missing_path_name',
        pathId: meta.id,
      });
    }

    configs[meta.id] = {
      ...normalizedConfig,
      id: meta.id,
      name: normalizedName,
    };
  });

  return { configs, settingsPathOrder };
};
