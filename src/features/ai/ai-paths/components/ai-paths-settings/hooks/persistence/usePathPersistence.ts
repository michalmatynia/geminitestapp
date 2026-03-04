import { useCallback, useRef, useState } from 'react';
import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import {
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  compileGraph,
  normalizeNodes,
  safeParseJson,
  stableStringify,
  sanitizeEdges,
} from '@/shared/lib/ai-paths';
import { buildCompileWarningMessage } from '@/shared/lib/ai-paths/core/utils/compile-warning-message';
import { updateAiPathsSettingsBulk } from '@/shared/lib/ai-paths/settings-store-client';
import { buildPersistedRuntimeState, sanitizePathConfig } from '../../../AiPathsSettingsUtils';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import { useSelectionActions } from '@/features/ai/ai-paths/context/SelectionContext';
import {
  buildNodesForAutoSave as buildNodesForAutoSaveHelper,
  collectInvalidPathSavePayloadIssues,
  lintPathNodeRoles,
  mergeNodeOverride,
  normalizeConfigForHash,
  resolvePathSaveBlockedMessage,
  stripNodeConfig,
} from '../../useAiPathsPersistence.helpers';
import { pruneSingleCardinalityIncomingEdges } from '../../edge-cardinality-repair';
import type { PathSaveOptions, UseAiPathsPersistenceArgs } from '../../useAiPathsPersistence.types';

export function usePathPersistence(
  args: UseAiPathsPersistenceArgs,
  core: {
    enqueueSettingsWrite: <T>(operation: () => Promise<T>) => Promise<T>;
    stringifyForStorage: (value: unknown, label: string) => string;
    persistLastError: (error: unknown) => Promise<void>;
  }
) {
  const { setNodes, setEdges, setPathConfigs, setPaths } = useGraphActions();
  const { setLastError } = useRuntimeActions();
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
      const sanitizedConfig = sanitizePathConfig(config);
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
      } catch {
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
      edgesOverride?: Edge[]
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
        runtimeState: args.runtimeState,
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
        if (lintResult.errors.length > 0) {
          const baselineNodes = pathConfigsRef.current[args.activePathId]?.nodes ?? [];
          const baselineLint = lintPathNodeRoles(Array.isArray(baselineNodes) ? baselineNodes : []);
          const baselineDuplicateCounts = new Map<string, number>(
            baselineLint.duplicateRoleTypes.map(
              (item: { type: string; count: number }): [string, number] => [item.type, item.count]
            )
          );
          const hasNewDuplicateRoleViolation = lintResult.duplicateRoleTypes.some(
            (item: { type: string; count: number }): boolean =>
              item.count > (baselineDuplicateCounts.get(item.type) ?? 1)
          );
          if (hasNewDuplicateRoleViolation) {
            if (!silent) {
              args.toast(lintResult.errors.join(' '), { variant: 'error' });
            }
            return false;
          }
        }
        if (!silent && lintResult.warnings.length > 0) {
          lintResult.warnings.forEach((message: string): void => {
            args.toast(message, { variant: 'info' });
          });
        }
        const rawEdgesForSave = options?.edgesOverride ?? edgesRef.current;
        const normalizedNodesForSave = normalizeNodes(nodesForSave);
        const edgesForSave = sanitizeEdges(normalizedNodesForSave, rawEdgesForSave);
        const repairedEdges = pruneSingleCardinalityIncomingEdges(
          normalizedNodesForSave,
          edgesForSave
        );
        const edgesForSaveResolved = repairedEdges.edges;
        if (!silent && repairedEdges.removedEdges.length > 0) {
          const count = repairedEdges.removedEdges.length;
          args.toast(
            `Auto-repaired ${count} duplicate wire${count === 1 ? '' : 's'} on single-cardinality inputs.`,
            { variant: 'warning' }
          );
        }
        const savePayloadIssues = collectInvalidPathSavePayloadIssues(
          normalizedNodesForSave,
          edgesForSaveResolved
        );
        if (savePayloadIssues.length > 0) {
          const firstIssue = savePayloadIssues[0];
          const message = firstIssue
            ? `Path save blocked: invalid graph payload (${firstIssue.path}: ${firstIssue.message}).`
            : 'Path save blocked: invalid graph payload.';
          args.reportAiPathsError(
            new Error(message),
            {
              action: silent ? 'validateSavePayloadSilent' : 'validateSavePayload',
              pathId: args.activePathId,
              savePayloadIssues: savePayloadIssues.slice(0, 10),
            },
            'Failed to validate AI Paths payload before save:'
          );
          if (!silent) {
            args.toast(message, { variant: 'error' });
          }
          return false;
        }
        if (
          !options?.edgesOverride &&
          stableStringify(rawEdgesForSave) !== stableStringify(edgesForSaveResolved)
        ) {
          setEdges(edgesForSaveResolved);
        }
        const compileReport = compileGraph(nodesForSave, edgesForSaveResolved);
        if (!silent && compileReport.errors > 0) {
          const primaryError = compileReport.findings.find(
            (finding): boolean => finding.severity === 'error'
          );
          const message =
            primaryError?.message ??
            `Graph compile reports ${compileReport.errors} blocking issue(s). Runs will be blocked until fixed.`;
          args.toast(message, { variant: 'warning' });
        }
        if (!silent && compileReport.warnings > 0) {
          const warningMessage = buildCompileWarningMessage(compileReport);
          args.toast(warningMessage, { variant: 'warning' });
        }
        const config = buildActivePathConfig(
          updatedAt,
          nodesForSave,
          resolvedName,
          edgesForSaveResolved
        );
        const nextPaths = pathsRef.current.map(
          (path: PathMeta): PathMeta =>
            path.id === args.activePathId ? { ...path, name: resolvedName, updatedAt } : path
        );
        const persistedConfig = await persistPathSettings(nextPaths, args.activePathId, config);
        const finalConfig = persistedConfig ?? config;
        if (options?.nodeOverride) {
          const expectedNode = options.nodeOverride;
          const normalizedExpectedConfig = sanitizePathConfig(config);
          const samePosition = (left: AiNode, right: AiNode): boolean =>
            Number(left.position?.x ?? Number.NaN) === Number(right.position?.x ?? Number.NaN) &&
            Number(left.position?.y ?? Number.NaN) === Number(right.position?.y ?? Number.NaN);
          const findBySignature = (candidates: AiNode[], needle: AiNode): AiNode | undefined =>
            candidates.find(
              (node: AiNode): boolean =>
                node.type === needle.type &&
                node.title === needle.title &&
                samePosition(node, needle)
            );
          const expectedNodeIndex = config.nodes.findIndex(
            (node: AiNode): boolean => node.id === expectedNode.id
          );
          const normalizedExpectedNodeByIndex =
            expectedNodeIndex >= 0 ? normalizedExpectedConfig.nodes[expectedNodeIndex] : undefined;
          const normalizedExpectedNode: AiNode | undefined =
            normalizedExpectedConfig.nodes.find(
              (node: AiNode): boolean => node.id === expectedNode.id
            ) ??
            (normalizedExpectedNodeByIndex?.type === expectedNode.type
              ? normalizedExpectedNodeByIndex
              : undefined) ??
            findBySignature(normalizedExpectedConfig.nodes, expectedNode);
          const persistedNode: AiNode | undefined = normalizedExpectedNode
            ? (finalConfig.nodes.find(
              (node: AiNode): boolean => node.id === normalizedExpectedNode.id
            ) ?? findBySignature(finalConfig.nodes, normalizedExpectedNode))
            : undefined;
          const expectedConfigHash = stableStringify(normalizedExpectedNode?.config ?? null);
          const persistedConfigHash = stableStringify(persistedNode?.config ?? null);
          if (!persistedNode || expectedConfigHash !== persistedConfigHash) {
            console.warn('[AI Paths] Node save verification mismatch after successful write.', {
              pathId: args.activePathId,
              expectedNodeId: expectedNode.id,
              resolvedExpectedNodeId: normalizedExpectedNode?.id ?? null,
              persistedNodeId: persistedNode?.id ?? null,
            });
          }
        }
        const finalUpdatedAt =
          typeof finalConfig.updatedAt === 'string' && finalConfig.updatedAt.trim().length > 0
            ? finalConfig.updatedAt
            : updatedAt;
        const finalPaths = nextPaths.map(
          (path: PathMeta): PathMeta =>
            path.id === args.activePathId ? { ...path, updatedAt: finalUpdatedAt } : path
        );
        const finalNodes = normalizeNodes(finalConfig.nodes);
        const finalEdges = sanitizeEdges(finalNodes, finalConfig.edges);
        const preferredSelectedNodeId = args.selectedNodeId;
        const finalSelectedNodeId =
          preferredSelectedNodeId &&
          finalNodes.some((node: AiNode): boolean => node.id === preferredSelectedNodeId)
            ? preferredSelectedNodeId
            : (finalNodes[0]?.id ?? null);

        setPathConfigs({ ...pathConfigsRef.current, [args.activePathId]: finalConfig });
        setNodes(finalNodes);
        setEdges(finalEdges);
        selectNode(finalSelectedNodeId);
        setPaths(finalPaths);
        setLastError(null);
        void core.persistLastError(null);
        lastSavedSnapshotRef.current = buildPathSnapshot(resolvedName);
        if (!silent) {
          args.toast('AI Paths saved.', { variant: 'success' });
        }
        return true;
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message.trim() : '';
        const shouldExposeRawMessage =
          rawMessage.length > 0 &&
          (/deprecated ai snapshot keys/i.test(rawMessage) ||
            /legacy ai paths/i.test(rawMessage) ||
            /ai path config contains/i.test(rawMessage));
        args.reportAiPathsError(
          error,
          { action: silent ? 'savePathSilent' : 'savePath', pathId: args.activePathId },
          'Failed to save AI Paths settings:'
        );
        if (!silent) {
          args.toast(
            shouldExposeRawMessage ? rawMessage : 'Failed to save AI Paths settings.',
            { variant: 'error' }
          );
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
