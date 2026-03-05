import type { AiNode, NodeDefinition, PathConfig } from '@/shared/contracts/ai-paths';

import { hashString, stableStringify } from './runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

type NodeIdentityLike = Pick<AiNode, 'type' | 'title'> &
  Partial<Pick<AiNode, 'config' | 'nodeTypeId'>>;

export type PathIdentityRepairWarning = {
  code: 'missing_node_id' | 'duplicate_node_id';
  message: string;
  sourceNodeId?: string;
};

export type PathIdentityRepairResult = {
  config: PathConfig;
  changed: boolean;
  warnings: PathIdentityRepairWarning[];
};

export type PathIdentityValidationIssue = {
  code:
    | 'missing_node_id'
    | 'invalid_node_id'
    | 'duplicate_node_id'
    | 'invalid_instance_id'
    | 'invalid_node_type_id'
    | 'invalid_selected_node_id'
    | 'invalid_parser_sample_node_id'
    | 'invalid_updater_sample_node_id'
    | 'invalid_runtime_state_node_id';
  message: string;
  nodeId?: string;
  expected?: string;
  location?: string;
};

type PathIdentityRepairOptions = {
  palette?: NodeDefinition[];
};

const NODE_INSTANCE_ID_PREFIX = 'node-';
const NODE_TYPE_ID_PREFIX = 'nt-';
const HASH_HEX_LENGTH = 24;
const NODE_INSTANCE_ID_HASH_PATTERN = /^node-[a-f0-9]{24}$/;
const NODE_TYPE_ID_HASH_PATTERN = /^nt-[a-f0-9]{24}$/;

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const getTriggerEvent = (node: NodeIdentityLike): string =>
  asTrimmedString((node.config as { trigger?: { event?: unknown } } | undefined)?.trigger?.event);

const composeHashHex = (seed: string): string => {
  const normalizedSeed = seed.trim().length > 0 ? seed : 'ai_paths';
  return [
    hashString(normalizedSeed),
    hashString(`a:${normalizedSeed}`),
    hashString(`b:${normalizedSeed}`),
    hashString(`c:${normalizedSeed}`),
  ]
    .join('')
    .slice(0, HASH_HEX_LENGTH);
};

const createHashedIdentifier = (prefix: string, seed: string): string =>
  `${prefix}${composeHashHex(seed)}`;

const isHashedNodeInstanceId = (value: string): boolean =>
  NODE_INSTANCE_ID_HASH_PATTERN.test(value);

const isHashedNodeTypeId = (value: string): boolean => NODE_TYPE_ID_HASH_PATTERN.test(value);

const createNodeTypeHashId = (args: {
  type: string;
  title: string;
  triggerEvent?: string | null;
  sourceNodeTypeId?: string | null;
  index?: number;
  collisionSalt?: number;
}): string => {
  const seed = stableStringify({
    kind: 'ai_paths_node_type',
    type: asTrimmedString(args.type) || 'unknown',
    title: asTrimmedString(args.title),
    triggerEvent: asTrimmedString(args.triggerEvent ?? ''),
    // Keep stable seed key name for deterministic id continuity.
    legacyNodeTypeId: asTrimmedString(args.sourceNodeTypeId ?? ''),
    index:
      typeof args.index === 'number' && Number.isFinite(args.index)
        ? Math.max(0, Math.trunc(args.index))
        : null,
    collisionSalt:
      typeof args.collisionSalt === 'number' && Number.isFinite(args.collisionSalt)
        ? Math.max(0, Math.trunc(args.collisionSalt))
        : 0,
  });
  return createHashedIdentifier(NODE_TYPE_ID_PREFIX, seed);
};

export const derivePaletteNodeTypeId = (
  definition: Pick<NodeDefinition, 'type' | 'title' | 'config'>,
  index?: number,
  collisionSalt = 0
): string => {
  return createNodeTypeHashId({
    type: definition.type,
    title: definition.title,
    triggerEvent: definition.type === 'trigger' ? getTriggerEvent(definition) : null,
    index,
    collisionSalt,
  });
};

export const createNodeInstanceId = (usedIds: Set<string> | Iterable<string>): string => {
  const used = usedIds instanceof Set ? usedIds : new Set<string>(usedIds);
  let candidate = '';
  let attempt = 0;
  while (!candidate || used.has(candidate)) {
    const entropy = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}:${Math.random()}:${attempt}`;
    candidate = createHashedIdentifier(NODE_INSTANCE_ID_PREFIX, `${entropy}:${attempt}`);
    attempt += 1;
  }
  if (usedIds instanceof Set) {
    usedIds.add(candidate);
  }
  return candidate;
};

const findDefinitionForNode = (
  node: NodeIdentityLike,
  palette: NodeDefinition[]
): NodeDefinition | null => {
  if (palette.length === 0) return null;

  const exactTitle = palette.find(
    (definition: NodeDefinition): boolean =>
      definition.type === node.type && definition.title === node.title
  );
  if (exactTitle) return exactTitle;

  const nodeTriggerEvent = getTriggerEvent(node);
  if (node.type === 'trigger' && nodeTriggerEvent.length > 0) {
    const byTriggerEvent = palette.find((definition: NodeDefinition): boolean => {
      if (definition.type !== 'trigger') return false;
      return getTriggerEvent(definition) === nodeTriggerEvent;
    });
    if (byTriggerEvent) return byTriggerEvent;
  }

  return (
    palette.find((definition: NodeDefinition): boolean => definition.type === node.type) ?? null
  );
};

export const resolveNodeTypeId = (
  node: NodeIdentityLike,
  palette: NodeDefinition[] = []
): string => {
  const explicit = asTrimmedString(node.nodeTypeId);
  if (explicit.length > 0 && isHashedNodeTypeId(explicit)) return explicit;

  const definition = findDefinitionForNode(node, palette);
  if (definition) {
    const fromDefinition = asTrimmedString(definition.nodeTypeId);
    if (fromDefinition.length > 0 && isHashedNodeTypeId(fromDefinition)) {
      return fromDefinition;
    }
    return createNodeTypeHashId({
      type: definition.type,
      title: definition.title,
      triggerEvent: definition.type === 'trigger' ? getTriggerEvent(definition) : null,
      sourceNodeTypeId: fromDefinition.length > 0 ? fromDefinition : explicit,
    });
  }

  const fallbackType = asTrimmedString(node.type);
  return createNodeTypeHashId({
    type: fallbackType.length > 0 ? fallbackType : 'unknown',
    title: asTrimmedString(node.title),
    triggerEvent: node.type === 'trigger' ? getTriggerEvent(node) : null,
    sourceNodeTypeId: explicit.length > 0 ? explicit : null,
  });
};

const remapNodeKeyedRecord = (
  value: unknown,
  remapNodeId: (nodeId: string) => string
): { value: unknown; changed: boolean } => {
  if (!isObjectRecord(value)) {
    return { value, changed: false };
  }

  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const remappedKey = remapNodeId(key);
    if (remappedKey !== key) changed = true;

    if (!(remappedKey in next)) {
      next[remappedKey] = entry;
      continue;
    }
    changed = true;
    const existing = next[remappedKey];
    if (Array.isArray(existing) && Array.isArray(entry)) {
      const existingArray = existing as unknown[];
      const incomingArray = entry as unknown[];
      next[remappedKey] = [...existingArray, ...incomingArray];
      continue;
    }
    if (isObjectRecord(existing) && isObjectRecord(entry)) {
      next[remappedKey] = {
        ...existing,
        ...entry,
      };
      continue;
    }
  }
  return changed ? { value: next, changed: true } : { value, changed: false };
};

const remapRuntimeState = (
  runtimeState: unknown,
  remapNodeId: (nodeId: string) => string
): { runtimeState: Record<string, unknown> | string | undefined; changed: boolean } => {
  const remapRuntimeObject = (
    value: Record<string, unknown>
  ): { runtimeState: Record<string, unknown>; changed: boolean } => {
    let changed = false;
    const next = { ...value };

    (
      [
        'inputs',
        'outputs',
        'history',
        'hashes',
        'hashTimestamps',
        'nodeStatuses',
        'nodeOutputs',
      ] as const
    ).forEach((key) => {
      const remapped = remapNodeKeyedRecord(next[key], remapNodeId);
      if (!remapped.changed) return;
      next[key] = remapped.value;
      changed = true;
    });

    return { runtimeState: next, changed };
  };

  if (typeof runtimeState === 'string') {
    try {
      const parsed = JSON.parse(runtimeState) as unknown;
      if (!isObjectRecord(parsed)) {
        return {
          runtimeState: runtimeState as string | Record<string, unknown> | undefined,
          changed: false,
        };
      }
      const remapped = remapRuntimeObject(parsed);
      if (!remapped.changed) {
        return {
          runtimeState: runtimeState as string | Record<string, unknown> | undefined,
          changed: false,
        };
      }
      return {
        runtimeState: JSON.stringify(remapped.runtimeState),
        changed: true,
      };
    } catch {
      return {
        runtimeState: runtimeState as string | Record<string, unknown> | undefined,
        changed: false,
      };
    }
  }

  if (!isObjectRecord(runtimeState)) {
    return {
      runtimeState: runtimeState as string | Record<string, unknown> | undefined,
      changed: false,
    };
  }

  const remapped = remapRuntimeObject(runtimeState);
  return {
    runtimeState: remapped.runtimeState,
    changed: remapped.changed,
  };
};

const collectNodeKeyReferenceIssues = (
  value: unknown,
  nodeIds: Set<string>,
  location: string,
  code:
    | 'invalid_parser_sample_node_id'
    | 'invalid_updater_sample_node_id'
    | 'invalid_runtime_state_node_id'
): PathIdentityValidationIssue[] => {
  if (!isObjectRecord(value)) return [];

  const issues: PathIdentityValidationIssue[] = [];
  Object.keys(value).forEach((rawNodeId: string): void => {
    const trimmedNodeId = rawNodeId.trim();
    if (trimmedNodeId.length > 0 && rawNodeId === trimmedNodeId && nodeIds.has(trimmedNodeId)) {
      return;
    }
    issues.push({
      code,
      nodeId: rawNodeId || undefined,
      location,
      message: `Non-canonical node reference "${rawNodeId}" found at ${location}.`,
    });
  });
  return issues;
};

const parseRuntimeStateRecord = (runtimeState: unknown): Record<string, unknown> | null => {
  if (isObjectRecord(runtimeState)) return runtimeState;
  if (typeof runtimeState !== 'string' || runtimeState.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(runtimeState) as unknown;
    return isObjectRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const validateCanonicalPathNodeIdentities = (
  pathConfig: PathConfig,
  options?: PathIdentityRepairOptions
): PathIdentityValidationIssue[] => {
  const palette = options?.palette ?? [];
  const issues: PathIdentityValidationIssue[] = [];
  const usedIds = new Set<string>();

  (pathConfig.nodes ?? []).forEach((node: AiNode): void => {
    const rawId = typeof node.id === 'string' ? node.id : '';
    const trimmedId = rawId.trim();
    if (!trimmedId) {
      issues.push({
        code: 'missing_node_id',
        message: `Node "${node.title || node.type}" is missing a canonical node id.`,
      });
      return;
    }

    if (rawId !== trimmedId || !isHashedNodeInstanceId(trimmedId)) {
      issues.push({
        code: 'invalid_node_id',
        nodeId: rawId,
        expected: 'node-[a-f0-9]{24}',
        message: `Node "${node.title || node.type}" uses non-canonical id "${rawId}".`,
      });
    }

    if (usedIds.has(trimmedId)) {
      issues.push({
        code: 'duplicate_node_id',
        nodeId: trimmedId,
        message: `Duplicate node id "${trimmedId}" is not supported.`,
      });
    } else {
      usedIds.add(trimmedId);
    }

    const instanceId = asTrimmedString((node as { instanceId?: unknown }).instanceId);
    if (instanceId !== trimmedId) {
      issues.push({
        code: 'invalid_instance_id',
        nodeId: trimmedId,
        expected: trimmedId,
        message: `Node "${trimmedId}" must persist instanceId "${trimmedId}".`,
      });
    }

    const expectedNodeTypeId = resolveNodeTypeId(node, palette);
    if (asTrimmedString(node.nodeTypeId) !== expectedNodeTypeId) {
      issues.push({
        code: 'invalid_node_type_id',
        nodeId: trimmedId,
        expected: expectedNodeTypeId,
        message: `Node "${trimmedId}" uses non-canonical nodeTypeId.`,
      });
    }
  });

  const selectedNodeId =
    typeof pathConfig.uiState?.selectedNodeId === 'string'
      ? pathConfig.uiState.selectedNodeId
      : null;
  if (selectedNodeId) {
    const trimmedSelectedNodeId = selectedNodeId.trim();
    if (selectedNodeId !== trimmedSelectedNodeId || !usedIds.has(trimmedSelectedNodeId)) {
      issues.push({
        code: 'invalid_selected_node_id',
        nodeId: selectedNodeId,
        location: 'uiState.selectedNodeId',
        message: `Non-canonical selected node reference "${selectedNodeId}" is not supported.`,
      });
    }
  }

  issues.push(
    ...collectNodeKeyReferenceIssues(
      pathConfig.parserSamples,
      usedIds,
      'parserSamples',
      'invalid_parser_sample_node_id'
    )
  );
  issues.push(
    ...collectNodeKeyReferenceIssues(
      pathConfig.updaterSamples,
      usedIds,
      'updaterSamples',
      'invalid_updater_sample_node_id'
    )
  );

  const runtimeState = parseRuntimeStateRecord(pathConfig.runtimeState);
  if (runtimeState) {
    (
      [
        'inputs',
        'outputs',
        'history',
        'hashes',
        'hashTimestamps',
        'nodeStatuses',
        'nodeOutputs',
      ] as const
    ).forEach((location) => {
      issues.push(
        ...collectNodeKeyReferenceIssues(
          runtimeState[location],
          usedIds,
          `runtimeState.${location}`,
          'invalid_runtime_state_node_id'
        )
      );
    });
  }

  return issues;
};

export const repairPathNodeIdentities = (
  pathConfig: PathConfig,
  options?: PathIdentityRepairOptions
): PathIdentityRepairResult => {
  const palette = options?.palette ?? [];
  const warnings: PathIdentityRepairWarning[] = [];
  const usedIds = new Set<string>();
  const firstResolvedBySourceId = new Map<string, string>();
  const duplicateCounts = new Map<string, number>();
  const sourceOccurrenceCounts = new Map<string, number>();

  const remapNodeId = (candidate: string): string => {
    const direct = firstResolvedBySourceId.get(candidate);
    if (direct) return direct;
    const trimmed = candidate.trim();
    if (!trimmed) return candidate;
    return firstResolvedBySourceId.get(trimmed) ?? candidate;
  };

  let changed = false;
  const pathIdSeed = asTrimmedString(pathConfig.id) || 'path';
  const repairedNodes = (pathConfig.nodes ?? []).map((node: AiNode): AiNode => {
    const rawSourceId = typeof node.id === 'string' ? node.id : '';
    const trimmedSourceId = rawSourceId.trim();

    let nextId: string;
    if (!trimmedSourceId) {
      nextId = createNodeInstanceId(usedIds);
      warnings.push({
        code: 'missing_node_id',
        message: `Generated a missing node id for "${node.title || node.type}".`,
      });
      changed = true;
    } else {
      const occurrence = (sourceOccurrenceCounts.get(trimmedSourceId) ?? 0) + 1;
      sourceOccurrenceCounts.set(trimmedSourceId, occurrence);
      const isDuplicateSourceId = occurrence > 1;
      const canReuseHashedSourceId =
        occurrence === 1 &&
        isHashedNodeInstanceId(trimmedSourceId) &&
        !usedIds.has(trimmedSourceId);
      if (canReuseHashedSourceId) {
        nextId = trimmedSourceId;
        usedIds.add(nextId);
      } else {
        nextId = createNodeInstanceIdFromSource(
          {
            pathId: pathIdSeed,
            sourceId: trimmedSourceId,
            node,
            occurrence,
          },
          usedIds
        );
      }
      if (isDuplicateSourceId) {
        duplicateCounts.set(trimmedSourceId, occurrence);
        warnings.push({
          code: 'duplicate_node_id',
          sourceNodeId: trimmedSourceId,
          message: `Duplicate node id "${trimmedSourceId}" detected; remapped duplicate to "${nextId}".`,
        });
      }
      if (nextId !== rawSourceId) {
        changed = true;
      }
    }

    if (!firstResolvedBySourceId.has(rawSourceId)) {
      firstResolvedBySourceId.set(rawSourceId, nextId);
    }
    if (trimmedSourceId && !firstResolvedBySourceId.has(trimmedSourceId)) {
      firstResolvedBySourceId.set(trimmedSourceId, nextId);
    }

    const nextNodeTypeId = resolveNodeTypeId(node, palette);
    const nextInstanceId = nextId;
    if (
      node.id !== nextId ||
      node.instanceId !== nextInstanceId ||
      node.nodeTypeId !== nextNodeTypeId
    ) {
      changed = true;
    }

    return {
      ...node,
      id: nextId,
      instanceId: nextInstanceId,
      nodeTypeId: nextNodeTypeId,
    };
  });

  duplicateCounts.forEach((_count: number, sourceId: string): void => {
    warnings.push({
      code: 'duplicate_node_id',
      sourceNodeId: sourceId,
      message: `Ambiguous references for duplicate id "${sourceId}" were remapped to the first kept node.`,
    });
  });

  const repairedEdges = (pathConfig.edges ?? []).map((edge) => {
    const nextFrom = typeof edge.from === 'string' ? remapNodeId(edge.from) : edge.from;
    const nextTo = typeof edge.to === 'string' ? remapNodeId(edge.to) : edge.to;
    if (nextFrom !== edge.from || nextTo !== edge.to) {
      changed = true;
      return {
        ...edge,
        ...(typeof nextFrom === 'string' ? { from: nextFrom } : {}),
        ...(typeof nextTo === 'string' ? { to: nextTo } : {}),
      };
    }
    return edge;
  });

  const selectedNodeId = pathConfig.uiState?.selectedNodeId;
  const remappedSelectedNodeId =
    typeof selectedNodeId === 'string' ? remapNodeId(selectedNodeId) : selectedNodeId;
  const nextUiState =
    pathConfig.uiState && remappedSelectedNodeId !== selectedNodeId
      ? { ...pathConfig.uiState, selectedNodeId: remappedSelectedNodeId }
      : pathConfig.uiState;
  if (nextUiState !== pathConfig.uiState) {
    changed = true;
  }

  const remappedParserSamples = remapNodeKeyedRecord(pathConfig.parserSamples, remapNodeId);
  if (remappedParserSamples.changed) {
    changed = true;
  }

  const remappedUpdaterSamples = remapNodeKeyedRecord(pathConfig.updaterSamples, remapNodeId);
  if (remappedUpdaterSamples.changed) {
    changed = true;
  }

  const remappedRuntimeState = remapRuntimeState(pathConfig.runtimeState, remapNodeId);
  if (remappedRuntimeState.changed) {
    changed = true;
  }

  const nextConfig: PathConfig = changed
    ? {
      ...pathConfig,
      nodes: repairedNodes,
      edges: repairedEdges,
      ...(nextUiState ? { uiState: nextUiState } : {}),
      ...(remappedParserSamples.changed
        ? { parserSamples: remappedParserSamples.value as PathConfig['parserSamples'] }
        : {}),
      ...(remappedUpdaterSamples.changed
        ? { updaterSamples: remappedUpdaterSamples.value as PathConfig['updaterSamples'] }
        : {}),
      ...(remappedRuntimeState.changed
        ? { runtimeState: remappedRuntimeState.runtimeState }
        : {}),
    }
    : pathConfig;

  return {
    config: nextConfig,
    changed,
    warnings,
  };
};
