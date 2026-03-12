import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import {
  getAutoSeedStarterWorkflowEntries,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { resolvePortablePathInput } from '@/shared/lib/ai-paths/portable-engine';

import { normalizeLoadedPathName, sanitizeTriggerPathConfig } from './trigger-normalization';

const LEGACY_TRIGGER_PROVIDER_ALIASES = new Set(['all', 'mongodb']);

export const repairLegacyTriggerProviderAliases = (
  config: PathConfig
): { config: PathConfig; changed: boolean } => {
  if (!Array.isArray(config.nodes) || config.nodes.length === 0) {
    return { config, changed: false };
  }

  let changed = false;
  const nextNodes = config.nodes.map((node: AiNode): AiNode => {
    if (node.type === 'database') {
      const databaseConfig =
        node.config?.database && typeof node.config.database === 'object'
          ? node.config.database
          : null;
      const queryConfig =
        databaseConfig?.query && typeof databaseConfig.query === 'object'
          ? databaseConfig.query
          : null;
      const provider =
        typeof queryConfig?.provider === 'string' ? queryConfig.provider.trim().toLowerCase() : null;
      if (!databaseConfig || !queryConfig || !provider) {
        return node;
      }
      if (!LEGACY_TRIGGER_PROVIDER_ALIASES.has(provider)) {
        return node;
      }

      changed = true;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            query: {
              ...queryConfig,
              provider: 'auto',
            },
          },
        },
      };
    }

    if (node.type === 'db_schema') {
      const schemaConfig =
        node.config?.db_schema && typeof node.config.db_schema === 'object'
          ? node.config.db_schema
          : null;
      const provider =
        typeof schemaConfig?.provider === 'string' ? schemaConfig.provider.trim().toLowerCase() : null;
      if (!schemaConfig || !provider || !LEGACY_TRIGGER_PROVIDER_ALIASES.has(provider)) {
        return node;
      }

      changed = true;
      return {
        ...node,
        config: {
          ...node.config,
          db_schema: {
            ...schemaConfig,
            provider: 'auto',
          },
        },
      };
    }

    return node;
  });

  return changed
    ? {
        config: {
          ...config,
          nodes: nextNodes,
        },
        changed: true,
      }
    : { config, changed: false };
};

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
  const rawUiState =
    parsedConfig?.['uiState'] && typeof parsedConfig['uiState'] === 'object' && !Array.isArray(parsedConfig['uiState'])
      ? (parsedConfig['uiState'] as Record<string, unknown>)
      : null;
  const rawSelectedNodeId =
    typeof rawUiState?.['selectedNodeId'] === 'string'
      ? rawUiState['selectedNodeId'].trim() || null
      : rawUiState?.['selectedNodeId'] === null
        ? null
        : undefined;
  const rawConfigOpen = typeof rawUiState?.['configOpen'] === 'boolean' ? rawUiState['configOpen'] : undefined;

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

const resolveSelectedNodeIdOverride = (
  parsedConfig: Record<string, unknown> | null
): string | null | undefined => {
  if (!parsedConfig) {
    return undefined;
  }
  const rawUiState =
    parsedConfig['uiState'] && typeof parsedConfig['uiState'] === 'object' && !Array.isArray(parsedConfig['uiState'])
      ? (parsedConfig['uiState'] as Record<string, unknown>)
      : null;
  if (!rawUiState) {
    return null;
  }
  if (typeof rawUiState['selectedNodeId'] === 'string') {
    return rawUiState['selectedNodeId'].trim() || null;
  }
  if (rawUiState['selectedNodeId'] === null) {
    return null;
  }
  return null;
};

const resolveSeededStarterFallbackConfig = (args: {
  pathId: string;
  rawConfig: string;
  fallbackName?: string | null | undefined;
}): PathConfig | null => {
  const { pathId, rawConfig, fallbackName } = args;
  const entry =
    getAutoSeedStarterWorkflowEntries().find((candidate) => candidate.seedPolicy?.defaultPathId === pathId) ??
    null;
  if (!entry) return null;

  let parsedConfig: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(rawConfig) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsedConfig = parsed as Record<string, unknown>;
    }
  } catch {
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
    seededDefault: true,
    updatedAt: normalizeOptionalText(parsedConfig?.['updatedAt']),
  });
};

const normalizeResolvedTriggerConfig = (args: {
  pathId: string;
  fallbackName?: string | null | undefined;
  config: PathConfig;
  selectedNodeIdOverride?: string | null | undefined;
}): PathConfig => {
  const resolvedConfig = resolvePortablePathInput(args.config, {
    repairIdentities: true,
    includeConnections: false,
    signingPolicyTelemetrySurface: 'product',
    nodeCodeObjectHashVerificationMode: 'warn',
  });
  const candidateConfig = resolvedConfig.ok ? resolvedConfig.value.pathConfig : args.config;
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

  const selectedNodeIdOverride =
    args.selectedNodeIdOverride === undefined
      ? undefined
      : typeof args.selectedNodeIdOverride === 'string'
        ? args.selectedNodeIdOverride.trim() || null
        : null;
  const normalizedSelectedNodeId =
    selectedNodeIdOverride === undefined
      ? undefined
      : selectedNodeIdOverride &&
          (normalizedConfig.nodes ?? []).some((node: AiNode): boolean => node.id === selectedNodeIdOverride)
        ? selectedNodeIdOverride
        : null;

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

export const materializeStoredTriggerPathConfig = (args: {
  pathId: string;
  rawConfig: string;
  fallbackName?: string | null | undefined;
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
    const rawStarterUpgrade = rawParsedConfig ? upgradeStarterWorkflowPathConfig(rawParsedConfig) : null;
    const triggerPreflightBaseConfig = rawStarterUpgrade?.config ?? rawParsedConfig;
    const providerAliasRepair =
      triggerPreflightBaseConfig ? repairLegacyTriggerProviderAliases(triggerPreflightBaseConfig) : null;
    const configForResolution = providerAliasRepair?.config ?? rawStarterUpgrade?.config ?? parsedConfig;

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
                typeof (configForResolution as { id?: unknown }).id === 'string' &&
                (configForResolution as { id?: string }).id!.trim().length > 0
                  ? (configForResolution as { id: string }).id.trim()
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

    return {
      config: normalizeResolvedTriggerConfig({
        pathId,
        fallbackName,
        config: mergedConfig,
        selectedNodeIdOverride: resolveSelectedNodeIdOverride(rawParsedConfig as Record<string, unknown> | null),
      }),
      changed: Boolean(rawStarterUpgrade?.changed || providerAliasRepair?.changed),
    };
  } catch (error) {
    const fallbackConfig = resolveSeededStarterFallbackConfig({
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
