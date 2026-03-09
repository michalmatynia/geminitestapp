import { isObjectRecord } from '@/shared/utils/object-utils';

// Keep this list to explicit legacy hard-cut node types that must be rejected on load/run.
export const REMOVED_LEGACY_AI_PATH_NODE_TYPES = [
  'description_updater',
] as const;

export type RemovedLegacyAiPathNodeType = (typeof REMOVED_LEGACY_AI_PATH_NODE_TYPES)[number];

export type RemovedLegacyAiPathNodeUsage = {
  index: number;
  nodeId: string | null;
  nodeTitle: string | null;
  nodeType: RemovedLegacyAiPathNodeType;
};

const REMOVED_LEGACY_AI_PATH_NODE_TYPE_SET = new Set<string>(REMOVED_LEGACY_AI_PATH_NODE_TYPES);

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const findRemovedLegacyAiPathNodes = (
  nodes: unknown
): RemovedLegacyAiPathNodeUsage[] => {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node: unknown, index: number): RemovedLegacyAiPathNodeUsage[] => {
    if (!isObjectRecord(node)) return [];
    const nodeType = asTrimmedString(node['type']);
    if (!REMOVED_LEGACY_AI_PATH_NODE_TYPE_SET.has(nodeType)) return [];
    return [
      {
        index,
        nodeId: asTrimmedString(node['id']) || null,
        nodeTitle: asTrimmedString(node['title']) || null,
        nodeType: nodeType as RemovedLegacyAiPathNodeType,
      },
    ];
  });
};

export const findRemovedLegacyAiPathNodesInDocument = (
  document: unknown
): RemovedLegacyAiPathNodeUsage[] => {
  if (!isObjectRecord(document)) return [];
  const direct = findRemovedLegacyAiPathNodes(document['nodes']);
  if (direct.length > 0) return direct;

  const semanticDocument = document['document'];
  if (isObjectRecord(semanticDocument)) {
    const nested = findRemovedLegacyAiPathNodes(semanticDocument['nodes']);
    if (nested.length > 0) return nested;
  }

  const portableEnvelope = document['package'];
  if (isObjectRecord(portableEnvelope)) {
    const nestedDocument = portableEnvelope['document'];
    if (isObjectRecord(nestedDocument)) {
      return findRemovedLegacyAiPathNodes(nestedDocument['nodes']);
    }
  }

  return [];
};

export const findRemovedLegacyAiPathNodesInPathConfig = (
  pathConfig: { nodes?: unknown } | null | undefined
): RemovedLegacyAiPathNodeUsage[] => {
  if (!pathConfig || typeof pathConfig !== 'object') return [];
  return findRemovedLegacyAiPathNodes((pathConfig as { nodes?: unknown }).nodes);
};

const formatRemovedNodeLabel = (node: RemovedLegacyAiPathNodeUsage): string => {
  const nodeId = node.nodeId ? ` (${node.nodeId})` : '';
  const nodeTitle = node.nodeTitle ? `"${node.nodeTitle}" ` : '';
  return `${nodeTitle}<${node.nodeType}>${nodeId}`;
};

const REMOVED_LEGACY_AI_PATH_NODE_REPLACEMENTS: Record<RemovedLegacyAiPathNodeType, string> = {
  description_updater:
    'Replace it with a Database node write operation that persists `description_en` explicitly.',
};

export const formatRemovedLegacyAiPathNodesMessage = (
  removedNodes: RemovedLegacyAiPathNodeUsage[],
  options?: {
    surface?: 'path config' | 'run graph' | 'semantic document' | 'portable payload';
  }
): string => {
  const surface = options?.surface ?? 'path config';
  const normalizedSurface =
    surface === 'semantic document'
      ? 'semantic document'
      : surface === 'portable payload'
        ? 'portable payload'
        : surface;
  const examples = removedNodes.slice(0, 3).map(formatRemovedNodeLabel).join(', ');
  const countLabel = removedNodes.length === 1 ? 'node' : 'nodes';
  const removedNodeTypes = Array.from(
    new Set(removedNodes.map((node: RemovedLegacyAiPathNodeUsage) => node.nodeType))
  );
  const replacementGuidance = removedNodeTypes
    .map(
      (nodeType: RemovedLegacyAiPathNodeType): string =>
        REMOVED_LEGACY_AI_PATH_NODE_REPLACEMENTS[nodeType]
    )
    .join(' ');
  return [
    `AI Paths ${normalizedSurface} contains removed legacy ${countLabel}: ${examples}.`,
    `Legacy Description node types ${removedNodeTypes.map((nodeType) => `\`${nodeType}\``).join(', ')} are no longer supported.`,
    replacementGuidance,
  ].join(' ');
};
