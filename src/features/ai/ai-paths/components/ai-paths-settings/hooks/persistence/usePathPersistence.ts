'use client';

import { useCallback, useRef, useState } from 'react';

import {
  buildPersistedRuntimeState,
  sanitizePathConfig,
} from '@/shared/lib/ai-paths/core/utils/path-config-sanitization';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { repairPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils/node-identity';
import {
  normalizeParserSamples,
  normalizeUpdaterSamples,
  parseRuntimeState,
} from '@/shared/lib/ai-paths/core/utils/runtime-state';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import { useSelectionActions } from '@/features/ai/ai-paths/context/SelectionContext';
import type { LastErrorInfo } from '@/shared/contracts/ai-paths-runtime-ui-types';
import type {
  AiNode,
  Edge,
  ParserSampleState,
  PathConfig,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY, STORAGE_VERSION, compileGraph, normalizeNodes, safeParseJson, stableStringify, sanitizeEdges } from '@/shared/lib/ai-paths';
import { buildCompileWarningMessage } from '@/shared/lib/ai-paths/core/utils/compile-warning-message';
import { updateAiPathsSettingsBulk } from '@/shared/lib/ai-paths/settings-store-client';

import { pruneSingleCardinalityIncomingEdges } from '../../edge-cardinality-repair';
import {
  buildNodesForAutoSave as buildNodesForAutoSaveHelper,
  collectInvalidPathSavePayloadIssues,
  lintPathNodeRoles,
  mergeNodeOverride,
  normalizeConfigForHash,
  resolvePersistedNodeConfigMismatch,
  resolvePathSaveBlockedMessage,
  shouldExposePathSaveRawMessage,
  stripNodeConfig,
} from '../../useAiPathsPersistence.helpers';

import type { PathSaveOptions, UseAiPathsPersistenceArgs } from '../../useAiPathsPersistence.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type PathNodeLintResult = ReturnType<typeof lintPathNodeRoles>;
type GraphCompileReport = ReturnType<typeof compileGraph>;

const hasNewDuplicateRoleViolation = (
  activePathId: string,
  lintResult: PathNodeLintResult,
  pathConfigs: Record<string, PathConfig>
): boolean => {
  const baselineNodes = pathConfigs[activePathId]?.nodes ?? [];
  const baselineLint = lintPathNodeRoles(Array.isArray(baselineNodes) ? baselineNodes : []);
  const baselineDuplicateCounts = new Map<string, number>(
    baselineLint.duplicateRoleTypes.map(
      (item: { type: string; count: number }): [string, number] => [item.type, item.count]
    )
  );

  return lintResult.duplicateRoleTypes.some(
    (item: { type: string; count: number }): boolean =>
      item.count > (baselineDuplicateCounts.get(item.type) ?? 1)
  );
};

const notifyLintWarnings = (
  toast: UseAiPathsPersistenceArgs['toast'],
  lintResult: PathNodeLintResult,
  silent: boolean
): void => {
  if (silent || lintResult.warnings.length === 0) {
    return;
  }

  lintResult.warnings.forEach((message: string): void => {
    toast(message, { variant: 'info' });
  });
};

const resolveEdgesForPathSave = ({
  edgesOverride,
  nodesForSave,
  rawEdges,
  setEdges,
  silent,
  toast,
}: {
  edgesOverride?: Edge[];
  nodesForSave: AiNode[];
  rawEdges: Edge[];
  setEdges: (edges: Edge[]) => void;
  silent: boolean;
  toast: UseAiPathsPersistenceArgs['toast'];
}): { edgesForSaveResolved: Edge[]; normalizedNodesForSave: AiNode[] } => {
  const normalizedNodesForSave = normalizeNodes(nodesForSave);
  const edgesForSave = sanitizeEdges(normalizedNodesForSave, rawEdges);
  const repairedEdges = pruneSingleCardinalityIncomingEdges(normalizedNodesForSave, edgesForSave);

  if (!silent && repairedEdges.removedEdges.length > 0) {
    const count = repairedEdges.removedEdges.length;
    toast(
      `Auto-repaired ${count} duplicate wire${count === 1 ? '' : 's'} on single-cardinality inputs.`,
      { variant: 'warning' }
    );
  }
  if (!edgesOverride && stableStringify(rawEdges) !== stableStringify(repairedEdges.edges)) {
    setEdges(repairedEdges.edges);
  }

  return {
    edgesForSaveResolved: repairedEdges.edges,
    normalizedNodesForSave,
  };
};

const validatePathSavePayload = ({
  activePathId,
  args,
  edgesForSaveResolved,
  normalizedNodesForSave,
  silent,
}: {
  activePathId: string;
  args: UseAiPathsPersistenceArgs;
  edgesForSaveResolved: Edge[];
  normalizedNodesForSave: AiNode[];
  silent: boolean;
}): boolean => {
  const savePayloadIssues = collectInvalidPathSavePayloadIssues(
    normalizedNodesForSave,
    edgesForSaveResolved
  );

  if (savePayloadIssues.length === 0) {
    return true;
  }

  const firstIssue = savePayloadIssues[0];
  const message = firstIssue
    ? `Path save blocked: invalid graph payload (${firstIssue.path}: ${firstIssue.message}).`
    : 'Path save blocked: invalid graph payload.';
  args.reportAiPathsError(
    new Error(message),
    {
      action: silent ? 'validateSavePayloadSilent' : 'validateSavePayload',
      pathId: activePathId,
      savePayloadIssues: savePayloadIssues.slice(0, 10),
    },
    'Failed to validate AI Paths payload before save:'
  );
  if (!silent) {
    args.toast(message, { variant: 'error' });
  }

  return false;
};

const notifyCompileReport = ({
  compileReport,
  silent,
  toast,
}: {
  compileReport: GraphCompileReport;
  silent: boolean;
  toast: UseAiPathsPersistenceArgs['toast'];
}): void => {
  if (silent) {
    return;
  }

  if (compileReport.errors > 0) {
    const primaryError = compileReport.findings.find(
      (finding): boolean => finding.severity === 'error'
    );
    const message =
      primaryError?.message ??
      `Graph compile reports ${compileReport.errors} blocking issue(s). Runs will be blocked until fixed.`;
    toast(message, { variant: 'warning' });
  }
  if (compileReport.warnings > 0) {
    toast(buildCompileWarningMessage(compileReport), { variant: 'warning' });
  }
};

const buildNextPathsForSave = (
  activePathId: string,
  paths: PathMeta[],
  resolvedName: string,
  updatedAt: string
): PathMeta[] =>
  paths.map((path: PathMeta): PathMeta =>
    path.id === activePathId ? { ...path, name: resolvedName, updatedAt } : path
  );

const preparePathConfigForPersistence = (config: PathConfig): PathConfig => {
  const repaired = repairPathNodeIdentities(config, { palette });
  return repaired.changed ? repaired.config : config;
};

const verifyPersistedNodeOverride = ({
  activePathId,
  args,
  config,
  finalConfig,
  nodeOverride,
  silent,
}: {
  activePathId: string;
  args: UseAiPathsPersistenceArgs;
  config: PathConfig;
  finalConfig: PathConfig;
  nodeOverride?: AiNode;
  silent: boolean;
}): boolean => {
  if (!nodeOverride) {
    return true;
  }

  const mismatch = resolvePersistedNodeConfigMismatch({
    expectedNode: nodeOverride,
    expectedConfig: sanitizePathConfig(preparePathConfigForPersistence(config)),
    persistedConfig: finalConfig,
  });
  if (!mismatch) {
    return true;
  }

  const message =
    'Failed to save node settings. Persisted node configuration did not match the requested update.';
  args.reportAiPathsError(
    new Error(message),
    {
      action: silent ? 'verifyNodeConfigSilent' : 'verifyNodeConfig',
      pathId: activePathId,
      ...mismatch,
    },
    'Failed to verify persisted AI Paths node settings:'
  );
  if (!silent) {
    args.toast(message, { variant: 'error' });
  }

  return false;
};

const resolvePersistedUpdatedAt = (finalConfig: PathConfig, updatedAt: string): string =>
  typeof finalConfig.updatedAt === 'string' && finalConfig.updatedAt.trim().length > 0
    ? finalConfig.updatedAt
    : updatedAt;

const resolveFinalSelectedNodeId = (
  finalNodes: AiNode[],
  preferredSelectedNodeId: string | null | undefined
): string | null =>
  preferredSelectedNodeId &&
  finalNodes.some((node: AiNode): boolean => node.id === preferredSelectedNodeId)
    ? preferredSelectedNodeId
    : (finalNodes[0]?.id ?? null);

const applyPersistedPathState = ({
  activePathId,
  finalConfig,
  finalPaths,
  pathConfigs,
  persistLastError,
  preferredSelectedNodeId,
  selectNode,
  setEdges,
  setLastError,
  setLastRunAt,
  setNodes,
  setParserSamples,
  setPathConfigs,
  setPaths,
  setRuntimeState,
  setUpdaterSamples,
}: {
  activePathId: string;
  finalConfig: PathConfig;
  finalPaths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  persistLastError: (error: LastErrorInfo | null) => Promise<void>;
  preferredSelectedNodeId: string | null | undefined;
  selectNode: (nodeId: string | null) => void;
  setEdges: (edges: Edge[]) => void;
  setLastError: (error: LastErrorInfo | null) => void;
  setLastRunAt: (value: string | null) => void;
  setNodes: (nodes: AiNode[]) => void;
  setParserSamples: (samples: Record<string, ParserSampleState>) => void;
  setPathConfigs: (pathConfigs: Record<string, PathConfig>) => void;
  setPaths: (paths: PathMeta[]) => void;
  setRuntimeState: (state: RuntimeState) => void;
  setUpdaterSamples: (samples: Record<string, UpdaterSampleState>) => void;
}): void => {
  const finalNodes = normalizeNodes(finalConfig.nodes);
  const finalEdges = sanitizeEdges(finalNodes, finalConfig.edges);

  setPathConfigs({ ...pathConfigs, [activePathId]: finalConfig });
  setNodes(finalNodes);
  setEdges(finalEdges);
  setParserSamples(normalizeParserSamples(finalConfig.parserSamples));
  setUpdaterSamples(normalizeUpdaterSamples(finalConfig.updaterSamples));
  setRuntimeState(parseRuntimeState(finalConfig.runtimeState));
  setLastRunAt(finalConfig.lastRunAt ?? null);
  selectNode(resolveFinalSelectedNodeId(finalNodes, preferredSelectedNodeId));
  setPaths(finalPaths);
  setLastError(null);
  void persistLastError(null);
};


export function usePathPersistence(
  args: UseAiPathsPersistenceArgs,
  core: {
    enqueueSettingsWrite: <T>(operation: () => Promise<T>) => Promise<T>;
    stringifyForStorage: (value: unknown, label: string) => string;
    persistLastError: (error: LastErrorInfo | null) => Promise<void>;
  }
) {
  const { setNodes, setEdges, setPathConfigs, setPaths } = useGraphActions();
  const { setLastError, setLastRunAt, setParserSamples, setRuntimeState, setUpdaterSamples } =
    useRuntimeActions();
  const { selectNode } = useSelectionActions();
  const [saving, setSaving] = useState(false);
  const [autoSaveAt, setAutoSaveAt] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const lastSettingsPayloadRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const nodesRef = useRef<AiNode[]>(args.nodes);
  const edgesRef = useRef<Edge[]>(args.edges);
  const pathConfigsRef = useRef<Record<string, PathConfig>>(args.pathConfigs);
  const pathsRef = useRef<PathMeta[]>(args.paths);

  // Sync refs
  nodesRef.current = args.nodes;
  edgesRef.current = args.edges;
  pathConfigsRef.current = args.pathConfigs;
  pathsRef.current = args.paths;

  const persistPathSettings = useCallback(
    async (
      nextPaths: PathMeta[],
      configId: string,
      config: PathConfig
    ): Promise<PathConfig | null> => {
      const sanitizedConfig = sanitizePathConfig(preparePathConfigForPersistence(config));
      const payloadKey = stableStringify({
        index: nextPaths,
        configId,
        config: normalizeConfigForHash(sanitizedConfig),
      });
      if (payloadKey === lastSettingsPayloadRef.current) return sanitizedConfig;
      const responses = await core.enqueueSettingsWrite(
        async (): Promise<Array<{ key: string; value: string }>> =>
          await updateAiPathsSettingsBulk([
            { key: PATH_INDEX_KEY, value: core.stringifyForStorage(nextPaths, 'path index') },
            {
              key: `${PATH_CONFIG_PREFIX}${configId}`,
              value: core.stringifyForStorage(sanitizedConfig, `path config (${configId})`),
            },
          ])
      );
      lastSettingsPayloadRef.current = payloadKey;
      const configResponse = responses[1];
      if (!configResponse) return sanitizedConfig;
      try {
        const payload = configResponse as { key?: unknown; value?: unknown };
        if (
          payload &&
          typeof payload.key === 'string' &&
          payload.key === `${PATH_CONFIG_PREFIX}${configId}` &&
          typeof payload.value === 'string'
        ) {
          const parsed = safeParseJson(payload.value).value;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as PathConfig;
          }
        }
      } catch (error) {
        logClientError(error);
      
        // Fallback to the client-side sanitized config when response payload parsing fails.
      }
      return sanitizedConfig;
    },
    [core]
  );

  const buildNodesForAutoSave = useCallback(
    (baseNodes: AiNode[] = args.nodes): AiNode[] =>
      buildNodesForAutoSaveHelper(baseNodes, args.activePathId, args.pathConfigs),
    [args.activePathId, args.nodes, args.pathConfigs]
  );

  const buildPathSnapshot = useCallback(
    (nameOverride?: string): string => {
      const normalizedSnapshotNodes = normalizeNodes(args.nodes);
      const normalizedSnapshotEdges = sanitizeEdges(normalizedSnapshotNodes, args.edges);
      return stableStringify({
        activePathId: args.activePathId,
        name: nameOverride ?? args.pathName,
        description: args.pathDescription,
        trigger: args.activeTrigger,
        executionMode: args.executionMode,
        flowIntensity: args.flowIntensity,
        runMode: args.runMode,
        strictFlowMode: args.strictFlowMode,
        blockedRunPolicy: args.blockedRunPolicy,
        aiPathsValidation: args.aiPathsValidation,
        isLocked: args.isPathLocked,
        isActive: args.isPathActive,
        uiState: {
          selectedNodeId: args.selectedNodeId,
        },
        nodes: stripNodeConfig([...args.nodes]).sort((a: AiNode, b: AiNode): number =>
          a.id.localeCompare(b.id)
        ),
        edges: [...normalizedSnapshotEdges].sort((a: Edge, b: Edge): number =>
          a.id.localeCompare(b.id)
        ),
        parserSamples: args.parserSamples,
        updaterSamples: args.updaterSamples,
        runtimeState: buildPersistedRuntimeState(args.runtimeState, normalizedSnapshotNodes),
        lastRunAt: args.lastRunAt,
        runCount:
          args.activePathId &&
          typeof args.pathConfigs[args.activePathId]?.runCount === 'number' &&
          Number.isFinite(args.pathConfigs[args.activePathId]?.runCount)
            ? Math.max(0, Math.trunc(args.pathConfigs[args.activePathId]?.runCount ?? 0))
            : 0,
      });
    },
    [args]
  );

  const buildActivePathConfig = useCallback(
    (
      updatedAt: string,
      nodesOverride?: AiNode[],
      nameOverride?: string,
      edgesOverride?: Edge[],
      runtimeStateOverride?: RuntimeState
    ): PathConfig => {
      const existingVersionRaw = args.activePathId
        ? pathConfigsRef.current[args.activePathId]?.version
        : undefined;
      const existingVersion =
        typeof existingVersionRaw === 'number' && Number.isFinite(existingVersionRaw)
          ? Math.trunc(existingVersionRaw)
          : STORAGE_VERSION;
      const resolvedVersion = Math.max(STORAGE_VERSION, existingVersion);
      const resolvedNodes = nodesOverride ?? nodesRef.current;
      const normalizedNodesForEdges = normalizeNodes(resolvedNodes);
      const resolvedEdges = edgesOverride ?? edgesRef.current;
      const canonicalEdges = sanitizeEdges(normalizedNodesForEdges, resolvedEdges);

      return {
        id: args.activePathId ?? 'default',
        version: resolvedVersion,
        name: nameOverride ?? args.pathName,
        description: args.pathDescription,
        trigger: args.activeTrigger,
        executionMode: args.executionMode,
        flowIntensity: args.flowIntensity,
        runMode: args.runMode,
        strictFlowMode: args.strictFlowMode,
        blockedRunPolicy: args.blockedRunPolicy,
        aiPathsValidation: args.aiPathsValidation,
        nodes: resolvedNodes,
        edges: canonicalEdges,
        updatedAt,
        isLocked: args.isPathLocked,
        isActive: args.isPathActive,
        parserSamples: args.parserSamples,
        updaterSamples: args.updaterSamples,
        runtimeState: runtimeStateOverride ?? args.runtimeState,
        lastRunAt: args.lastRunAt,
        runCount:
          args.activePathId &&
          typeof pathConfigsRef.current[args.activePathId]?.runCount === 'number' &&
          Number.isFinite(pathConfigsRef.current[args.activePathId]?.runCount)
            ? Math.max(0, Math.trunc(pathConfigsRef.current[args.activePathId]?.runCount ?? 0))
            : 0,
        uiState: {
          selectedNodeId: args.selectedNodeId,
        },
      };
    },
    [args]
  );

  const persistPathConfig = useCallback(
    async (options?: PathSaveOptions): Promise<boolean> => {
      if (!args.activePathId) return false;
      const silent = options?.silent ?? false;
      const force = options?.force ?? false;
      const includeNodeConfig = options?.includeNodeConfig ?? true;
      const resolvedName = options?.pathNameOverride ?? args.pathName;
      const blockedMessage = resolvePathSaveBlockedMessage(args.isPathLocked, args.isPathActive);
      if (blockedMessage) {
        if (!silent) {
          args.toast(blockedMessage, { variant: 'info' });
        }
        return false;
      }
      if (!force) {
        const snapshot = buildPathSnapshot(resolvedName);
        if (snapshot && snapshot === lastSavedSnapshotRef.current) {
          return true;
        }
      }
      if (!silent) setSaving(true);
      try {
        const updatedAt = new Date().toISOString();
        const baseNodes = options?.nodesOverride ?? nodesRef.current;
        const resolvedNodes = mergeNodeOverride(baseNodes, options?.nodeOverride);
        const nodesForSave = includeNodeConfig
          ? resolvedNodes
          : buildNodesForAutoSave(resolvedNodes);
        const lintResult = lintPathNodeRoles(nodesForSave);
        if (
          lintResult.errors.length > 0 &&
          hasNewDuplicateRoleViolation(args.activePathId, lintResult, pathConfigsRef.current)
        ) {
          if (!silent) {
            args.toast(lintResult.errors.join(' '), { variant: 'error' });
          }
          return false;
        }
        notifyLintWarnings(args.toast, lintResult, silent);
        const { edgesForSaveResolved, normalizedNodesForSave } = resolveEdgesForPathSave({
          edgesOverride: options?.edgesOverride,
          nodesForSave,
          rawEdges: options?.edgesOverride ?? edgesRef.current,
          setEdges,
          silent,
          toast: args.toast,
        });
        if (
          !validatePathSavePayload({
            activePathId: args.activePathId,
            args,
            edgesForSaveResolved,
            normalizedNodesForSave,
            silent,
          })
        ) {
          return false;
        }
        const compileReport = compileGraph(nodesForSave, edgesForSaveResolved);
        notifyCompileReport({
          compileReport,
          silent,
          toast: args.toast,
        });
        const config = buildActivePathConfig(
          updatedAt,
          nodesForSave,
          resolvedName,
          edgesForSaveResolved,
          options?.runtimeStateOverride
        );
        const nextPaths = buildNextPathsForSave(
          args.activePathId,
          pathsRef.current,
          resolvedName,
          updatedAt
        );
        const persistedConfig = await persistPathSettings(nextPaths, args.activePathId, config);
        const finalConfig = persistedConfig ?? config;
        if (
          !verifyPersistedNodeOverride({
            activePathId: args.activePathId,
            args,
            config,
            finalConfig,
            nodeOverride: options?.nodeOverride,
            silent,
          })
        ) {
          return false;
        }
        const finalUpdatedAt = resolvePersistedUpdatedAt(finalConfig, updatedAt);
        const finalPaths = buildNextPathsForSave(
          args.activePathId,
          nextPaths,
          resolvedName,
          finalUpdatedAt
        );
        applyPersistedPathState({
          activePathId: args.activePathId,
          finalConfig,
          finalPaths,
          pathConfigs: pathConfigsRef.current,
          persistLastError: core.persistLastError,
          preferredSelectedNodeId: args.selectedNodeId,
          selectNode,
          setEdges,
          setLastError,
          setLastRunAt,
          setNodes,
          setParserSamples,
          setPathConfigs,
          setPaths,
          setRuntimeState,
          setUpdaterSamples,
        });
        lastSavedSnapshotRef.current = buildPathSnapshot(resolvedName);
        if (!silent) {
          args.toast('AI Paths saved.', { variant: 'success' });
        }
        return true;
      } catch (error) {
        logClientError(error);
        const rawMessage = error instanceof Error ? error.message.trim() : '';
        const shouldExposeRawMessage = shouldExposePathSaveRawMessage(rawMessage);
        args.reportAiPathsError(
          error,
          { action: silent ? 'savePathSilent' : 'savePath', pathId: args.activePathId },
          'Failed to save AI Paths settings:'
        );
        if (!silent) {
          args.toast(shouldExposeRawMessage ? rawMessage : 'Failed to save AI Paths settings.', {
            variant: 'error',
          });
        }
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [
      args,
      core,
      buildPathSnapshot,
      buildActivePathConfig,
      buildNodesForAutoSave,
      persistPathSettings,
      setEdges,
      setNodes,
      setPathConfigs,
      setPaths,
      setLastError,
      selectNode,
    ]
  );

  return {
    saving,
    setSaving,
    autoSaveAt,
    setAutoSaveAt,
    autoSaveStatus,
    setAutoSaveStatus,
    persistPathConfig,
    persistPathSettings,
    buildPathSnapshot,
    lastSavedSnapshotRef,
  };
}
