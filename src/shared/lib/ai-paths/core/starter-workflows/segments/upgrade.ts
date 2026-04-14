import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { matchesLegacyStarterWorkflowRepairSignature } from './legacy-repair';
import {
  computeStarterWorkflowGraphHash,
  hasCanonicalGraphHash,
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

const STARTER_OVERLAY_PRESERVED_CONFIG_KEYS_BY_NODE_TYPE: Record<string, string[]> = {
  fetcher: ['fetcher'],
  model: ['model'],
  prompt: ['prompt'],
};

const isLegacyNormalizePromptUpgradeCandidate = (
  currentValue: unknown,
  latestValue: unknown
): boolean => {
  const currentTemplate = normalizeText(toRecord(currentValue)?.['template']).toLowerCase();
  const latestTemplate = normalizeText(toRecord(latestValue)?.['template']).toLowerCase();

  if (!currentTemplate || !latestTemplate) {
    return false;
  }

  return (
    currentTemplate.includes('context registry bundle supplied in the system context') &&
    currentTemplate.includes('authoritative leaf-category vocabulary for the active catalog selection') &&
    latestTemplate.includes('live product_categories context fetched during this workflow run') &&
    latestTemplate.includes('bundle.categorycontext.leafcategories')
  );
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

const preserveNonCanonicalStarterNodeConfigById = (
  current: PathConfig,
  next: PathConfig
): PathConfig => {
  if (!Array.isArray(current.nodes) || !Array.isArray(next.nodes) || next.nodes.length === 0) {
    return next;
  }

  const currentNodesById = new Map(current.nodes.map((node: AiNode) => [node.id, node] as const));

  let changed = false;
  const nextNodes = next.nodes.map((node: AiNode): AiNode => {
    const preservedConfigKeys = STARTER_OVERLAY_PRESERVED_CONFIG_KEYS_BY_NODE_TYPE[node.type] ?? [];
    if (preservedConfigKeys.length === 0) {
      return node;
    }

    const currentNode = currentNodesById.get(node.id);
    if (currentNode?.type !== node.type) {
      return node;
    }

    const currentConfig = toRecord(currentNode.config);
    if (!currentConfig) {
      return node;
    }

    const nextConfig = toRecord(node.config);
    let nodeChanged = false;
    const mergedConfig: Record<string, unknown> = { ...(nextConfig ?? {}) };

    preservedConfigKeys.forEach((configKey) => {
      const currentValue = currentConfig[configKey];
      if (currentValue === undefined) {
        return;
      }
      const latestValue = nextConfig?.[configKey];
      if (
        node.type === 'prompt' &&
        configKey === 'prompt' &&
        isLegacyNormalizePromptUpgradeCandidate(currentValue, latestValue)
      ) {
        return;
      }
      const mergedValue =
        toRecord(latestValue) && toRecord(currentValue)
          ? {
              ...toRecord(latestValue),
              ...toRecord(currentValue),
            }
          : currentValue;
      if (JSON.stringify(mergedValue) === JSON.stringify(latestValue)) {
        return;
      }
      mergedConfig[configKey] = mergedValue;
      nodeChanged = true;
    });

    if (!nodeChanged) {
      return node;
    }

    changed = true;
    return {
      ...node,
      config: mergedConfig,
    };
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

  const shouldRefreshCanonicalGraph =
    currentMatchesCanonicalHash ||
    resolution.matchedBy === 'legacy_alias' ||
    hasOutdatedStarterProvenance(provenance, resolution.entry, config);
  const latestNodeCount = (latest.nodes ?? []).length;
  const nodeIdOverlap = countNodeIdOverlap(config, latest);
  const shouldReplaceGraphCompletely = shouldReplaceLowOverlapStarterGraph({
    config,
    entry: resolution.entry,
    latestNodeCount,
    matchedBy: resolution.matchedBy,
    nodeIdOverlap,
    provenance,
  });

  if (!shouldRefreshCanonicalGraph && !shouldReplaceGraphCompletely) {
    return { config, changed: false, resolution };
  }

  const next = buildStarterGraphReplacement(config, latest);
  const nextWithPreservedModelConfig = currentMatchesCanonicalHash
    ? next
    : preserveNonCanonicalStarterNodeConfigById(config, next);
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
