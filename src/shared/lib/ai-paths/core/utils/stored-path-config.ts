import { pathConfigSchema, type PathConfig } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import { materializeStoredTriggerPathConfig } from '@/shared/lib/ai-paths/core/normalization/stored-trigger-path-config';
import { getStaticRecoveryStarterWorkflowEntryByDefaultPathId } from '@/shared/lib/ai-paths/core/starter-workflows';

import { sanitizePathConfig } from './path-config-sanitization';
import { stableStringify } from './runtime';

const throwInvalidStoredPathConfig = (args: {
  pathId: string;
  reason: string;
  cause?: string | null | undefined;
}): never => {
  throw validationError('Invalid AI Path config payload.', {
    source: 'ai_paths.path_config',
    pathId: args.pathId,
    reason: args.reason,
    ...(args.cause ? { cause: args.cause } : {}),
  });
};

const isStarterBackedPathConfig = (args: {
  pathId: string;
  parsedConfig: unknown;
}): boolean => {
  if (getStaticRecoveryStarterWorkflowEntryByDefaultPathId(args.pathId)) {
    return true;
  }
  if (!args.parsedConfig || typeof args.parsedConfig !== 'object' || Array.isArray(args.parsedConfig)) {
    return false;
  }
  const extensions = (args.parsedConfig as { extensions?: unknown }).extensions;
  if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) {
    return false;
  }
  const starter = (extensions as { aiPathsStarter?: unknown }).aiPathsStarter;
  return Boolean(starter && typeof starter === 'object' && !Array.isArray(starter));
};

export type LoadedStoredPathConfig = {
  config: PathConfig;
  changed: boolean;
};

const loadStoredPathConfig = (args: {
  pathId: string;
  rawConfig: string;
}): LoadedStoredPathConfig => {
  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(args.rawConfig) as unknown;
  } catch (error) {
    throwInvalidStoredPathConfig({
      pathId: args.pathId,
      reason: 'config_invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  const parsedPathConfigResult = pathConfigSchema.safeParse(parsedConfig);
  if (!parsedPathConfigResult.success) {
    throwInvalidStoredPathConfig({
      pathId: args.pathId,
      reason: 'config_invalid_payload',
      cause: parsedPathConfigResult.error.message,
    });
  }
  const parsedPathConfig = parsedPathConfigResult.data;
  if (!parsedPathConfig) {
    throwInvalidStoredPathConfig({
      pathId: args.pathId,
      reason: 'config_invalid_payload',
      cause: 'parsed_path_config_missing',
    });
  }

  let sanitizedConfig: PathConfig;
  try {
    sanitizedConfig = sanitizePathConfig(parsedPathConfig!);
  } catch (error) {
    if (!isStarterBackedPathConfig({ pathId: args.pathId, parsedConfig })) {
      throw error;
    }
    const resolvedStarterConfig = materializeStoredTriggerPathConfig({
      pathId: args.pathId,
      rawConfig: args.rawConfig,
      fallbackName:
        typeof parsedPathConfig?.name === 'string' ? parsedPathConfig.name : null,
      applyStarterWorkflowUpgrade: false,
      allowStaticRecoveryFallback: false,
    });
    return {
      config: resolvedStarterConfig.config,
      changed: resolvedStarterConfig.changed,
    };
  }
  const normalizedId =
    typeof sanitizedConfig.id === 'string' ? sanitizedConfig.id.trim() : '';
  if (!normalizedId || normalizedId !== args.pathId) {
    throw validationError('AI Path config id does not match stored path id.', {
      source: 'ai_paths.path_config',
      pathId: args.pathId,
      reason: 'config_id_mismatch',
      actualPathId: normalizedId || null,
    });
  }

  const normalizedName =
    typeof sanitizedConfig.name === 'string' ? sanitizedConfig.name.trim() : '';
  if (!normalizedName) {
    throw validationError('AI Path config name is required.', {
      source: 'ai_paths.path_config',
      pathId: args.pathId,
      reason: 'missing_path_name',
    });
  }

  return {
    config: sanitizedConfig,
    changed: stableStringify(parsedConfig) !== stableStringify(sanitizedConfig),
  };
};

export const loadCanonicalStoredPathConfig = (args: {
  pathId: string;
  rawConfig: string;
}): PathConfig => {
  const resolved = loadStoredPathConfig(args);
  if (resolved.changed) {
    throw validationError('AI Path config contains non-canonical persisted values.', {
      source: 'ai_paths.path_config',
      pathId: args.pathId,
      reason: 'non_canonical_persisted_values',
    });
  }

  return resolved.config;
};
