import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import {
  getStaticRecoveryStarterWorkflowEntryByDefaultPathId,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import { resolvePortablePathInput } from '@/shared/lib/ai-paths/portable-engine';

import { normalizeLoadedPathName, sanitizeTriggerPathConfig } from './trigger-normalization';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const createStoredPathConfigFallback = (pathId: string): PathConfig => {
  const baseConfig = createDefaultPathConfig(pathId);
  return {
    ...baseConfig,
    nodes: [],
    edges: [],
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    uiState: {
      selectedNodeId: null,
      configOpen: false,
    },
    lastRunAt: null,
    runCount: 0,
  };
};

const toObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const resolveStoredUiStateRecord = (
  parsedConfig: Record<string, unknown> | null
): Record<string, unknown> | null => toObjectRecord(parsedConfig?.['uiState']);

const resolveStoredSelectedNodeIdValue = (
  rawUiState: Record<string, unknown> | null
): string | null => {
  if (!rawUiState) {
    return null;
  }

  const rawSelectedNodeId = rawUiState['selectedNodeId'];
  return typeof rawSelectedNodeId === 'string'
    ? rawSelectedNodeId.trim() || null
    : rawSelectedNodeId === null
      ? null
      : null;
};

const resolveStoredConfigOpenValue = (
  rawUiState: Record<string, unknown> | null
): boolean | undefined => (typeof rawUiState?.['configOpen'] === 'boolean' ? rawUiState['configOpen'] : undefined);

const resolveStoredUiState = (args: {
  parsedConfig: Record<string, unknown> | null;
  resolvedUiState: PathConfig['uiState'] | undefined;
  baseUiState: PathConfig['uiState'];
}): PathConfig['uiState'] => {
  const { parsedConfig, resolvedUiState, baseUiState } = args;
  const fallbackUiState = baseUiState ?? {
    selectedNodeId: null,
    configOpen: false,
  };
  const rawUiState = resolveStoredUiStateRecord(parsedConfig);
  const rawSelectedNodeId = resolveStoredSelectedNodeIdValue(rawUiState);
  const rawConfigOpen = resolveStoredConfigOpenValue(rawUiState);

  return {
    ...(resolvedUiState && typeof resolvedUiState === 'object' ? resolvedUiState : {}),
    selectedNodeId: rawSelectedNodeId ?? fallbackUiState.selectedNodeId ?? null,
    configOpen: rawConfigOpen ?? resolvedUiState?.configOpen ?? fallbackUiState.configOpen ?? false,
  };
};

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const hasNodeWithId = (nodes: AiNode[] | undefined, selectedNodeId: string | null | undefined): boolean =>
  Boolean(selectedNodeId && (nodes ?? []).some((node: AiNode): boolean => node.id === selectedNodeId));

const normalizeSelectedNodeIdOverrideValue = (
  value: string | null | undefined,
  nodes: AiNode[] | undefined
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return hasNodeWithId(nodes, value) ? value : null;
};

const applySelectedNodeIdOverrideForSanitization = (args: {
  config: PathConfig;
  selectedNodeIdOverride?: string | null | undefined;
}): PathConfig => {
  const normalizedSelectedNodeId = normalizeSelectedNodeIdOverrideValue(
    args.selectedNodeIdOverride,
    args.config.nodes,
  );
  if (normalizedSelectedNodeId === undefined) {
    return args.config;
  }

  return {
    ...args.config,
    uiState: {
      ...(toObjectRecord(args.config.uiState) ?? {}),
      selectedNodeId: normalizedSelectedNodeId,
      configOpen:
        typeof args.config.uiState?.configOpen === 'boolean' ? args.config.uiState.configOpen : false,
    },
  };
};

const resolveSelectedNodeIdOverride = (
  parsedConfig: Record<string, unknown> | null
): string | null | undefined => {
  if (!parsedConfig) {
    return undefined;
  }

  return resolveStoredSelectedNodeIdValue(resolveStoredUiStateRecord(parsedConfig));
};

const resolveRecoverableStarterFallbackConfig = (args: {
  pathId: string;
  rawConfig: string;
  fallbackName?: string | null | undefined;
}): PathConfig | null => {
  const { pathId, rawConfig, fallbackName } = args;
  const entry = getStaticRecoveryStarterWorkflowEntryByDefaultPathId(pathId);
  if (!entry) return null;

  let parsedConfig: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(rawConfig) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsedConfig = parsed as Record<string, unknown>;
    }
  } catch (error) {
    logClientError(error);
    parsedConfig = null;
  }

  return materializeStarterWorkflowPathConfig(entry, {
    pathId,
    name:
      normalizeLoadedPathName(pathId, parsedConfig?.['name']) ||
      normalizeLoadedPathName(pathId, fallbackName) ||
      entry.name,
    description: normalizeOptionalText(parsedConfig?.['description']),
    isActive:
      typeof parsedConfig?.['isActive'] === 'boolean'
        ? parsedConfig['isActive']
        : entry.seedPolicy?.isActive,
    isLocked:
      typeof parsedConfig?.['isLocked'] === 'boolean'
        ? parsedConfig['isLocked']
        : entry.seedPolicy?.isLocked,
    seededDefault: entry.seedPolicy?.autoSeed === true,
    updatedAt: normalizeOptionalText(parsedConfig?.['updatedAt']),
  });
};

const normalizeResolvedTriggerConfig = (args: {
  pathId: string;
  fallbackName?: string | null | undefined;
  config: PathConfig;
  selectedNodeIdOverride?: string | null | undefined;
}): PathConfig => {
  const selectedNodeIdOverride =
    args.selectedNodeIdOverride === undefined
      ? undefined
      : typeof args.selectedNodeIdOverride === 'string'
        ? args.selectedNodeIdOverride.trim() || null
        : null;
  const preSanitizedConfig = applySelectedNodeIdOverrideForSanitization({
    config: args.config,
    selectedNodeIdOverride,
  });
  const resolvedConfig = resolvePortablePathInput(preSanitizedConfig, {
    repairIdentities: true,
    includeConnections: false,
    signingPolicyTelemetrySurface: 'product',
    nodeCodeObjectHashVerificationMode: 'warn',
  });
  const candidateConfig = resolvedConfig.ok ? resolvedConfig.value.pathConfig : preSanitizedConfig;
  const normalizedConfig = sanitizeTriggerPathConfig(candidateConfig);
  const normalizedId = typeof normalizedConfig.id === 'string' ? normalizedConfig.id.trim() : '';
  if (!normalizedId || normalizedId !== args.pathId) {
    throw validationError('AI Path config id does not match index entry.', {
      source: 'ai_paths.trigger_payload',
      reason: 'config_id_mismatch',
      expectedPathId: args.pathId,
      actualPathId: normalizedId || null,
    });
  }

  const normalizedName =
    normalizeLoadedPathName(args.pathId, normalizedConfig.name) ||
    normalizeLoadedPathName(args.pathId, args.fallbackName);
  if (!normalizedName) {
    throw validationError('AI Path config name is required.', {
      source: 'ai_paths.trigger_payload',
      reason: 'missing_path_name',
      pathId: args.pathId,
    });
  }

  const normalizedSelectedNodeId = normalizeSelectedNodeIdOverrideValue(
    selectedNodeIdOverride,
    normalizedConfig.nodes,
  );

  return {
    ...normalizedConfig,
    id: args.pathId,
    name: normalizedName,
    ...(normalizedSelectedNodeId === undefined
      ? {}
      : {
          uiState: {
            ...(normalizedConfig.uiState && typeof normalizedConfig.uiState === 'object'
              ? normalizedConfig.uiState
              : {}),
            selectedNodeId: normalizedSelectedNodeId,
            configOpen: normalizedConfig.uiState?.configOpen ?? false,
          },
        }),
  };
};

const didStoredTriggerConfigPersistedValueChange = (
  rawParsedConfig: PathConfig | null,
  normalizedConfig: PathConfig
): boolean => {
  if (!rawParsedConfig) {
    return true;
  }

  return stableStringify(rawParsedConfig) !== stableStringify(normalizedConfig);
};

export const materializeStoredTriggerPathConfig = (args: {
  pathId: string;
  rawConfig: string;
  fallbackName?: string | null | undefined;
  applyStarterWorkflowUpgrade?: boolean | undefined;
  allowStaticRecoveryFallback?: boolean | undefined;
}): {
  config: PathConfig;
  changed: boolean;
} => {
  const { pathId, rawConfig, fallbackName } = args;
  try {
    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(rawConfig) as unknown;
    } catch (error) {
      logClientError(error);
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_invalid_json',
        pathId,
        cause: error instanceof Error ? error.message : 'unknown_error',
      });
    }

    const rawParsedConfig =
      parsedConfig && typeof parsedConfig === 'object' && !Array.isArray(parsedConfig)
        ? (parsedConfig as PathConfig)
        : null;
    const rawStarterUpgrade =
      rawParsedConfig && args.applyStarterWorkflowUpgrade !== false
        ? upgradeStarterWorkflowPathConfig(rawParsedConfig)
        : null;
    const configForResolution = rawStarterUpgrade?.config ?? parsedConfig;

    const resolvedConfig = resolvePortablePathInput(configForResolution, {
      repairIdentities: true,
      includeConnections: false,
      signingPolicyTelemetrySurface: 'product',
      nodeCodeObjectHashVerificationMode: 'warn',
    });
    const resolvedConfigError = resolvedConfig.ok ? null : resolvedConfig.error;
    const baseConfig = createStoredPathConfigFallback(pathId);
    const mergedConfig =
      resolvedConfig.ok
        ? ({
            ...resolvedConfig.value.pathConfig,
            uiState: resolveStoredUiState({
              parsedConfig: rawParsedConfig ? (rawParsedConfig as Record<string, unknown>) : null,
              resolvedUiState: resolvedConfig.value.pathConfig.uiState,
              baseUiState: baseConfig.uiState,
            }),
            ...(
              parsedConfig &&
              typeof parsedConfig === 'object' &&
              !Array.isArray(parsedConfig) &&
              (parsedConfig as { extensions?: unknown }).extensions &&
              typeof (parsedConfig as { extensions?: unknown }).extensions === 'object' &&
              !Array.isArray((parsedConfig as { extensions?: unknown }).extensions)
                ? {
                    extensions: {
                      ...((parsedConfig as { extensions: Record<string, unknown> }).extensions ?? {}),
                      ...(
                        resolvedConfig.value.pathConfig.extensions &&
                        typeof resolvedConfig.value.pathConfig.extensions === 'object' &&
                        !Array.isArray(resolvedConfig.value.pathConfig.extensions)
                          ? resolvedConfig.value.pathConfig.extensions
                          : {}
                      ),
                    },
                  }
                : {}
            ),
          } as PathConfig)
        : parsedConfig && typeof parsedConfig === 'object' && !Array.isArray(parsedConfig)
          ? ({
              ...baseConfig,
              ...(configForResolution as Partial<PathConfig>),
              id:
                typeof (configForResolution as { id?: unknown }).id === 'string'
                  ? ((configForResolution as { id: string }).id.trim() || pathId)
                  : pathId,
              name:
                typeof (configForResolution as { name?: unknown }).name === 'string'
                  ? (configForResolution as { name: string }).name
                  : baseConfig.name,
            } as PathConfig)
          : null;

    if (!mergedConfig) {
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_invalid_payload',
        pathId,
        cause: resolvedConfigError,
      });
    }

    const normalizedConfig = normalizeResolvedTriggerConfig({
      pathId,
      fallbackName,
      config: mergedConfig,
      selectedNodeIdOverride: resolveSelectedNodeIdOverride(rawParsedConfig as Record<string, unknown> | null),
    });

    return {
      config: normalizedConfig,
      changed: didStoredTriggerConfigPersistedValueChange(rawParsedConfig, normalizedConfig),
    };
  } catch (error) {
    logClientError(error);
    if (args.allowStaticRecoveryFallback === false) {
      throw error;
    }
    const fallbackConfig = resolveRecoverableStarterFallbackConfig({
      pathId,
      rawConfig,
      fallbackName,
    });
    if (!fallbackConfig) {
      throw error;
    }
    return {
      config: normalizeResolvedTriggerConfig({
        pathId,
        fallbackName,
        config: fallbackConfig,
      }),
      changed: true,
    };
  }
};
