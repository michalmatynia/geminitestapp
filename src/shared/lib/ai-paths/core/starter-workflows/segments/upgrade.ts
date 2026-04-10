import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import { resolvePortablePathInput } from '@/shared/lib/ai-paths/portable-engine/portable-engine-resolvers';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { matchesLegacyStarterWorkflowRepairSignature } from './legacy-repair';
import {
  computeStarterWorkflowGraphHash,
  hasCanonicalGraphHash,
  isDatabaseOperation,
  normalizeText,
  readStarterProvenance,
  toRecord,
} from './utils';
import { STARTER_WORKFLOW_REGISTRY } from './templates';
import { materializeStarterWorkflowPathConfig } from './api';
import type {
  AiPathTemplateRegistryEntry,
  AiPathsStarterProvenance,
  StarterWorkflowLowOverlapReplacementMode,
  StarterWorkflowResolution,
  StarterWorkflowUpgradeResult,
  StarterWorkflowVersionedOverlayScope,
} from './types';

export { computeStarterWorkflowGraphHash } from './utils';

// Force cache bust: 2026-04-07T12:00:00Z

const edgeSignature = (edge: unknown): string => {
  const record = toRecord(edge) ?? {};
  return [
    normalizeText(record['from']),
    normalizeText(record['to']),
    normalizeText(record['fromPort']),
  ].join('|');
};

const renderTemplateToken = (sourcePort: string, sourcePath: string): string => {
  const normalizedPort = normalizeText(sourcePort) || 'value';
  const normalizedPath = normalizeText(sourcePath);
  return normalizedPath ? `{{${normalizedPort}.${normalizedPath}}}` : `{{${normalizedPort}}}`;
};

const shouldEmitUnquotedTemplateToken = (targetPath: string, sourcePath: string): boolean => {
  const normalizedTargetPath = normalizeText(targetPath).toLowerCase();
  const normalizedSourcePath = normalizeText(sourcePath).toLowerCase();
  return normalizedTargetPath === 'parameters' || normalizedSourcePath === 'parameters';
};

const deriveCustomUpdateTemplateFromMappings = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  const assignments = value
    .map((entry: unknown) => toRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .reduce<Array<{ targetPath: string; sourcePath: string; token: string }>>((acc, entry) => {
      const targetPath = normalizeText(entry['targetPath']);
      if (!targetPath) return acc;
      const sourcePath = normalizeText(entry['sourcePath']);
      acc.push({
        targetPath,
        sourcePath,
        token: renderTemplateToken(
          normalizeText(entry['sourcePort']) || 'value',
          sourcePath
        ),
      });
      return acc;
    }, []);

  if (assignments.length === 0) return null;
  const lines = assignments.map(
    ({ targetPath, sourcePath, token }) =>
      `    "${targetPath}": ${
        shouldEmitUnquotedTemplateToken(targetPath, sourcePath)
          ? token
          : JSON.stringify(token)
      }`
  );
  return (
    '{\n' +
    `  "$set": {\n${lines.join(',\n')}\n  },\n` +
    '  "$unset": {\n    "__noop__": ""\n  }\n' +
    '}'
  );
};

const buildIncomingPortMap = (config: PathConfig): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  (config.edges ?? []).forEach((edge) => {
    const toNodeId = normalizeText(edge.to);
    if (!toNodeId) return;
    const ports = map.get(toNodeId) ?? new Set<string>();
    const port = normalizeText(edge.toPort);
    if (port) ports.add(port);
    map.set(toNodeId, ports);
  });
  return map;
};

type ExplicitModelSelection = {
  modelId: string;
  nodeId: string;
  title: string;
};

type ModelConfigOverride = {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  vision?: boolean;
  waitForResult?: boolean;
  systemPrompt?: string;
};

const collectExplicitModelSelections = (config: PathConfig): ExplicitModelSelection[] =>
  (config.nodes ?? []).reduce<ExplicitModelSelection[]>((acc, node: AiNode) => {
    if (node.type !== 'model') return acc;
    const modelId = normalizeText(node.config?.model?.modelId);
    if (!modelId) return acc;
    acc.push({
      modelId,
      nodeId: node.id,
      title: normalizeText(node.title),
    });
    return acc;
  }, []);

const applyModelConfigOverrideToNode = (
  node: AiNode,
  override: ModelConfigOverride
): AiNode => {
  const currentConfig = node.config ?? {};
  const currentModel = node.config?.model;
  return {
    ...node,
    config: {
      ...currentConfig,
      model: {
        ...(override.modelId !== undefined
          ? { modelId: override.modelId }
          : currentModel?.modelId !== undefined
            ? { modelId: currentModel.modelId }
            : {}),
        temperature:
          typeof override.temperature === 'number' && Number.isFinite(override.temperature)
            ? override.temperature
            : (currentModel?.temperature ?? 0.7),
        maxTokens:
          typeof override.maxTokens === 'number' && Number.isFinite(override.maxTokens)
            ? override.maxTokens
            : (currentModel?.maxTokens ?? 800),
        vision:
          typeof override.vision === 'boolean'
            ? override.vision
            : (currentModel?.vision ?? (node.inputs ?? []).includes('images')),
        ...(override.systemPrompt !== undefined
          ? { systemPrompt: override.systemPrompt }
          : currentModel?.systemPrompt !== undefined
            ? { systemPrompt: currentModel.systemPrompt }
            : {}),
        ...(override.waitForResult !== undefined
          ? { waitForResult: override.waitForResult }
          : currentModel?.waitForResult !== undefined
            ? { waitForResult: currentModel.waitForResult }
            : {}),
      },
    },
  };
};

const applyExplicitModelIdToNode = (node: AiNode, modelId: string): AiNode => {
  const currentModelId = normalizeText(node.config?.model?.modelId);
  if (currentModelId === modelId) {
    return node;
  }
  return applyModelConfigOverrideToNode(node, { modelId });
};

const preserveNonCanonicalModelNodeConfigById = (
  current: PathConfig,
  next: PathConfig
): PathConfig => {
  if (!Array.isArray(current.nodes) || !Array.isArray(next.nodes) || next.nodes.length === 0) {
    return next;
  }

  const currentModelNodesById = new Map(
    current.nodes
      .filter((node: AiNode): boolean => node.type === 'model')
      .map((node: AiNode) => [node.id, node] as const)
  );

  let changed = false;
  const nextNodes = next.nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'model') {
      return node;
    }
    const currentNode = currentModelNodesById.get(node.id);
    const currentModel = currentNode?.config?.model;
    if (!currentModel) {
      return node;
    }

    const nextNode = applyModelConfigOverrideToNode(node, currentModel);
    if (JSON.stringify(nextNode) !== JSON.stringify(node)) {
      changed = true;
    }
    return nextNode;
  });

  return changed
    ? {
        ...next,
        nodes: nextNodes,
      }
    : next;
};

const preserveExplicitModelSelections = (current: PathConfig, next: PathConfig): PathConfig => {
  const explicitSelections = collectExplicitModelSelections(current);
  if (explicitSelections.length === 0 || !Array.isArray(next.nodes) || next.nodes.length === 0) {
    return next;
  }

  const selectionByNodeId = new Map(
    explicitSelections.map((selection) => [selection.nodeId, selection] as const)
  );
  const selectionsByTitle = explicitSelections.reduce<Map<string, ExplicitModelSelection[]>>(
    (acc, selection) => {
      const title = selection.title;
      if (!title) return acc;
      const existing = acc.get(title) ?? [];
      existing.push(selection);
      acc.set(title, existing);
      return acc;
    },
    new Map<string, ExplicitModelSelection[]>()
  );
  const nextModelNodes = next.nodes.filter((node: AiNode): boolean => node.type === 'model');

  let changed = false;
  const nextNodes = next.nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'model') {
      return node;
    }
    const existingModelId = normalizeText(node.config?.model?.modelId);
    if (existingModelId) {
      return node;
    }

    const byId = selectionByNodeId.get(node.id) ?? null;
    const byTitleCandidates = selectionsByTitle.get(normalizeText(node.title)) ?? [];
    const byTitle = byTitleCandidates.length === 1 ? byTitleCandidates[0] ?? null : null;
    const fallbackSingle =
      explicitSelections.length === 1 && nextModelNodes.length === 1 ? explicitSelections[0] ?? null : null;
    const preservedModelId = byId?.modelId ?? byTitle?.modelId ?? fallbackSingle?.modelId ?? '';
    if (!preservedModelId) {
      return node;
    }

    changed = true;
    return applyExplicitModelIdToNode(node, preservedModelId);
  });

  return changed
    ? {
        ...next,
        nodes: nextNodes,
      }
    : next;
};

const buildStarterAssetOverlay = (current: PathConfig, latest: PathConfig): PathConfig => {
  const latestNodesById = new Map((latest.nodes ?? []).map((node) => [node.id, node] as const));
  const latestEdgesById = new Map((latest.edges ?? []).map((edge) => [edge.id, edge] as const));
  const latestEdgesBySignature = new Map(
    (latest.edges ?? []).map((edge) => [edgeSignature(edge), edge] as const)
  );
  const currentIncomingPorts = buildIncomingPortMap(current);
  const promotedIncomingPorts = new Map(
    Array.from(currentIncomingPorts.entries()).map(
      ([nodeId, ports]) => [nodeId, new Set(ports)] as const
    )
  );
  (current.edges ?? []).forEach((edge) => {
    const latestEdge =
      latestEdgesById.get(edge.id) ?? latestEdgesBySignature.get(edgeSignature(edge));
    if (!latestEdge) return;
    const toNodeId = normalizeText(latestEdge.to);
    const toPort = normalizeText(latestEdge.toPort);
    if (!toNodeId || !toPort) return;
    const ports = promotedIncomingPorts.get(toNodeId) ?? new Set<string>();
    ports.add(toPort);
    promotedIncomingPorts.set(toNodeId, ports);
  });

  let nodeChanged = false;
  const nextNodes = (current.nodes ?? []).map((node) => {
    const latestNode = latestNodesById.get(node.id);
    if (latestNode?.type !== node.type) return node;
    const currentConfig = toRecord(node.config);
    const latestConfig = toRecord(latestNode.config);
    const currentDatabaseConfig = toRecord(currentConfig?.['database']);
    const latestDatabaseConfig = toRecord(latestConfig?.['database']);
    let nextLatestNode = latestNode;
    if (currentDatabaseConfig && latestDatabaseConfig) {
      const incomingPorts = promotedIncomingPorts.get(node.id) ?? new Set<string>();
      const latestTemplate = normalizeText(latestDatabaseConfig['updateTemplate']);
      const needsResultPort = latestTemplate.includes('{{result.');
      const downgradeResultPort = needsResultPort && !incomingPorts.has('result');
      const latestMappings = Array.isArray(latestDatabaseConfig['mappings'])
        ? (latestDatabaseConfig['mappings'] as Array<Record<string, unknown>>)
        : null;
      const adaptedMappings =
        latestMappings?.reduce<
          Array<{ targetPath: string; sourcePort: string; sourcePath?: string }>
        >((acc, mapping) => {
          const targetPath = normalizeText(mapping['targetPath']);
          const sourcePort = normalizeText(mapping['sourcePort']);
          if (!targetPath || !sourcePort) return acc;
          const nextSourcePort =
            sourcePort === 'result' && downgradeResultPort ? 'value' : sourcePort;
          const sourcePath = normalizeText(mapping['sourcePath']);
          acc.push({
            targetPath,
            sourcePort: nextSourcePort,
            ...(sourcePath ? { sourcePath } : {}),
          });
          return acc;
        }, []) ?? undefined;
      const mappingsChanged =
        latestMappings !== null &&
        JSON.stringify(adaptedMappings) !== JSON.stringify(latestDatabaseConfig['mappings']);
      const baseLatestDatabaseConfig = {
        ...latestDatabaseConfig,
        operation: isDatabaseOperation(latestDatabaseConfig['operation'])
          ? latestDatabaseConfig['operation']
          : 'update',
        ...(downgradeResultPort
          ? {
            updateTemplate: latestTemplate.replaceAll('{{result.', '{{value.'),
          }
          : {}),
        ...(latestMappings !== null ? { mappings: adaptedMappings } : {}),
      };
      const derivedTemplate =
        !incomingPorts.has('result') || needsResultPort === false
          ? ((needsResultPort ? latestTemplate.replaceAll('{{result.', '{{value.') : null) ??
            deriveCustomUpdateTemplateFromMappings(currentDatabaseConfig['mappings']))
          : null;
      if (
        normalizeText(currentDatabaseConfig['updatePayloadMode']).toLowerCase() === 'mapping' &&
        normalizeText(latestDatabaseConfig['updatePayloadMode']).toLowerCase() === 'custom' &&
        derivedTemplate
      ) {
        nextLatestNode = {
          ...latestNode,
          config: {
            ...latestConfig,
            database: {
              ...baseLatestDatabaseConfig,
              updateTemplate: derivedTemplate,
            },
          },
        };
      } else if (downgradeResultPort || mappingsChanged) {
        nextLatestNode = {
          ...latestNode,
          config: {
            ...latestConfig,
            database: baseLatestDatabaseConfig,
          },
        };
      }
    }
    const nextNode = {
      ...nextLatestNode,
      position: node.position ?? nextLatestNode.position,
      createdAt: node.createdAt ?? nextLatestNode.createdAt,
      updatedAt: node.updatedAt ?? nextLatestNode.updatedAt,
      data: node.data ?? nextLatestNode.data,
    };
    if (JSON.stringify(nextNode) !== JSON.stringify(node)) nodeChanged = true;
    return nextNode;
  });

  let edgeChanged = false;
  const nextEdges = (current.edges ?? []).map((edge) => {
    const latestEdge =
      latestEdgesById.get(edge.id) ?? latestEdgesBySignature.get(edgeSignature(edge));
    if (!latestEdge) return edge;
    const nextEdge = {
      ...latestEdge,
      createdAt: edge.createdAt ?? latestEdge.createdAt,
      updatedAt: edge.updatedAt ?? latestEdge.updatedAt,
      data: edge.data ?? latestEdge.data,
    };
    if (JSON.stringify(nextEdge) !== JSON.stringify(edge)) edgeChanged = true;
    return nextEdge;
  });

  const currentExtensions = toRecord(current.extensions);
  const latestExtensions = toRecord(latest.extensions);
  const nextConfig = {
    ...current,
    version: Math.max(current.version ?? 0, latest.version ?? 0),
    name: normalizeText(current.name) || latest.name,
    description: normalizeText(current.description) || latest.description,
    trigger: normalizeText(current.trigger) || latest.trigger,
    executionMode: latest.executionMode ?? current.executionMode,
    flowIntensity: latest.flowIntensity ?? current.flowIntensity,
    runMode: latest.runMode ?? current.runMode,
    strictFlowMode: latest.strictFlowMode ?? current.strictFlowMode,
    blockedRunPolicy: latest.blockedRunPolicy ?? current.blockedRunPolicy,
    aiPathsValidation: latest.aiPathsValidation ?? current.aiPathsValidation,
    isActive: current.isActive ?? latest.isActive,
    isLocked: current.isLocked ?? latest.isLocked,
    updatedAt: current.updatedAt ?? latest.updatedAt,
    nodes: nextNodes,
    edges: nextEdges,
    ...(currentExtensions || latestExtensions
      ? {
        extensions: {
          ...(currentExtensions ?? {}),
          ...(latestExtensions ?? {}),
        },
      }
      : {}),
  } as PathConfig;

  const preservedConfig = preserveExplicitModelSelections(current, nextConfig);

  if (!nodeChanged && !edgeChanged && JSON.stringify(preservedConfig) === JSON.stringify(current)) {
    return current;
  }
  return preservedConfig;
};

const buildStarterGraphReplacement = (current: PathConfig, latest: PathConfig): PathConfig => {
  const currentExtensions = toRecord(current.extensions);
  const latestExtensions = toRecord(latest.extensions);
  return preserveExplicitModelSelections(current, {
    ...latest,
    id: current.id,
    name: normalizeText(current.name) || latest.name,
    description: normalizeText(current.description) || latest.description,
    trigger: normalizeText(current.trigger) || latest.trigger,
    isActive: current.isActive ?? latest.isActive,
    isLocked: current.isLocked ?? latest.isLocked,
    updatedAt: current.updatedAt ?? latest.updatedAt,
    ...(currentExtensions || latestExtensions
      ? {
        extensions: {
          ...(currentExtensions ?? {}),
          ...(latestExtensions ?? {}),
        },
      }
      : {}),
  });
};

const countNodeIdOverlap = (left: PathConfig, right: PathConfig): number => {
  const rightNodeIds = new Set((right.nodes ?? []).map((node) => node.id));
  return (left.nodes ?? []).reduce((count, node) => count + Number(rightNodeIds.has(node.id)), 0);
};

const isSeededDefaultPath = (
  entry: AiPathTemplateRegistryEntry,
  config: PathConfig
): boolean => config.id === entry.seedPolicy?.defaultPathId;

const hasMatchingStarterProvenance = (
  provenance: AiPathsStarterProvenance | null,
  entry: AiPathTemplateRegistryEntry
): boolean => provenance?.starterKey === entry.starterLineage.starterKey;

const isPathEligibleForVersionedOverlay = (
  entry: AiPathTemplateRegistryEntry,
  config: PathConfig
): boolean => {
  const scope: StarterWorkflowVersionedOverlayScope =
    entry.upgradePolicy?.versionedOverlayScope ?? 'seeded_default_only';
  return scope === 'any_provenance_path' || isSeededDefaultPath(entry, config);
};

const hasOutdatedStarterProvenance = (
  provenance: AiPathsStarterProvenance | null,
  entry: AiPathTemplateRegistryEntry,
  config: PathConfig
): boolean =>
  hasMatchingStarterProvenance(provenance, entry) &&
  (provenance?.templateVersion ?? Number.POSITIVE_INFINITY) < entry.starterLineage.templateVersion &&
  isPathEligibleForVersionedOverlay(entry, config);

const shouldReplaceLowOverlapStarterGraph = (args: {
  config: PathConfig;
  entry: AiPathTemplateRegistryEntry;
  latestNodeCount: number;
  matchedBy: StarterWorkflowResolution['matchedBy'];
  nodeIdOverlap: number;
  provenance: AiPathsStarterProvenance | null;
}): boolean => {
  const policy = args.entry.upgradePolicy;
  const mode: StarterWorkflowLowOverlapReplacementMode =
    policy?.lowOverlapReplacementMode ?? 'never';
  if (mode === 'never' || args.nodeIdOverlap >= args.latestNodeCount) {
    return false;
  }

  if (policy?.lowOverlapStructuralMatcher && !policy.lowOverlapStructuralMatcher(args.config)) {
    return false;
  }

  if (mode === 'any_resolved') {
    return true;
  }

  if (mode === 'seeded_default_or_legacy_alias') {
    if (args.matchedBy === 'legacy_alias') {
      return true;
    }

    const seededDefaultPath = isSeededDefaultPath(args.entry, args.config);
    const matchingStarter = hasMatchingStarterProvenance(args.provenance, args.entry);
    const sameVersionSeededDefaultZeroOverlap =
      policy?.allowCurrentVersionSeededDefaultZeroOverlap === true &&
      seededDefaultPath &&
      matchingStarter &&
      args.provenance?.seededDefault === true &&
      args.provenance?.templateVersion === args.entry.starterLineage.templateVersion &&
      args.nodeIdOverlap === 0;

    return (
      hasOutdatedStarterProvenance(args.provenance, args.entry, args.config) ||
      sameVersionSeededDefaultZeroOverlap
    );
  }

  return false;
};

const selectStarterOverlaySource = (current: PathConfig, latest: PathConfig): PathConfig => {
  const variants: PathConfig[] = [latest];
  const resolvedLatest = resolvePortablePathInput(latest, {
    repairIdentities: true,
    includeConnections: false,
    signingPolicyTelemetrySurface: 'api',
    nodeCodeObjectHashVerificationMode: 'warn',
  });
  if (resolvedLatest.ok) {
    variants.push(resolvedLatest.value.pathConfig);
  }

  return variants.reduce<PathConfig>((best, candidate) => {
    const bestScore = countNodeIdOverlap(current, best);
    const candidateScore = countNodeIdOverlap(current, candidate);
    return candidateScore > bestScore ? candidate : best;
  }, variants[0]!);
};

export const resolveStarterWorkflowForPathConfig = (
  config: PathConfig
): StarterWorkflowResolution | null => {
  const provenance = readStarterProvenance(config);
  if (provenance) {
    const entryByTemplate = STARTER_WORKFLOW_REGISTRY.find(
      (entry) => entry.templateId === provenance.templateId
    );
    if (entryByTemplate) {
      return { entry: entryByTemplate, matchedBy: 'provenance' };
    }
    const entryByStarterKey = STARTER_WORKFLOW_REGISTRY.find(
      (entry) => entry.starterLineage.starterKey === provenance.starterKey
    );
    if (entryByStarterKey) {
      return { entry: entryByStarterKey, matchedBy: 'provenance' };
    }
  }
  const graphHash = computeStarterWorkflowGraphHash(config);
  const entryByCanonicalHash = STARTER_WORKFLOW_REGISTRY.find((entry) =>
    hasCanonicalGraphHash(entry, graphHash)
  );
  if (entryByCanonicalHash) {
    return { entry: entryByCanonicalHash, matchedBy: 'canonical_hash' };
  }
  const entryByLegacyAlias = STARTER_WORKFLOW_REGISTRY.find((entry) =>
    matchesLegacyStarterWorkflowRepairSignature(entry, config)
  );
  if (entryByLegacyAlias) {
    return { entry: entryByLegacyAlias, matchedBy: 'legacy_alias' };
  }
  return null;
};

export const upgradeStarterWorkflowPathConfig = (
  config: PathConfig
): StarterWorkflowUpgradeResult => {
  const resolution = resolveStarterWorkflowForPathConfig(config);
  if (!resolution) return { config, changed: false, resolution: null };
  const currentGraphHash = computeStarterWorkflowGraphHash(config);
  const currentMatchesCanonicalHash = hasCanonicalGraphHash(resolution.entry, currentGraphHash);
  const provenance = readStarterProvenance(config);

  const latest = materializeStarterWorkflowPathConfig(resolution.entry, {
    pathId: config.id,
    name: normalizeText(config.name) || resolution.entry.name,
    description: normalizeText(config.description) || resolution.entry.description,
    isActive: config.isActive,
    isLocked: config.isLocked,
    seededDefault:
      config.id === resolution.entry.seedPolicy?.defaultPathId &&
      resolution.entry.seedPolicy?.autoSeed === true,
  });

  const safeToOverlay =
    currentMatchesCanonicalHash ||
    resolution.matchedBy === 'legacy_alias' ||
    hasOutdatedStarterProvenance(provenance, resolution.entry, config);

  const overlaySource = selectStarterOverlaySource(config, latest);
  const latestNodeCount = (overlaySource.nodes ?? []).length;
  const nodeIdOverlap = countNodeIdOverlap(config, overlaySource);
  const shouldReplaceGraphCompletely = shouldReplaceLowOverlapStarterGraph({
    config,
    entry: resolution.entry,
    latestNodeCount,
    matchedBy: resolution.matchedBy,
    nodeIdOverlap,
    provenance,
  });

  if (!safeToOverlay && !shouldReplaceGraphCompletely) {
    return { config, changed: false, resolution };
  }

  const next = shouldReplaceGraphCompletely
    ? buildStarterGraphReplacement(config, latest)
    : buildStarterAssetOverlay(config, overlaySource);
  const nextWithPreservedModelConfig = currentMatchesCanonicalHash
    ? next
    : preserveNonCanonicalModelNodeConfigById(config, next);
  if (
    nextWithPreservedModelConfig === config ||
    JSON.stringify(nextWithPreservedModelConfig) === JSON.stringify(config)
  ) {
    return { config: nextWithPreservedModelConfig, changed: false, resolution };
  }

  return {
    config: {
      ...nextWithPreservedModelConfig,
      edges: sanitizeEdges(
        nextWithPreservedModelConfig.nodes ?? [],
        nextWithPreservedModelConfig.edges ?? []
      ),
    },
    changed: true,
    resolution,
  };
};
