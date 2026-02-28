import {
  type CaseResolverGraph,
  type CaseResolverNodeFileSnapshot,
  type CaseResolverWorkspace,
  type CaseResolverFile,
} from '@/shared/contracts/case-resolver';
import { sanitizeOptionalId } from './settings.helpers';
import { sanitizeGraph } from './settings-graph';
import { normalizeCaseResolverWorkspace } from './settings.workspace';

export const createEmptyNodeFileSnapshot = (): CaseResolverNodeFileSnapshot => ({
  kind: 'case_resolver_node_file_snapshot_v1',
  source: 'manual',
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
});

export const parseNodeFileSnapshot = (textContent: string): CaseResolverNodeFileSnapshot => {
  try {
    const parsed = JSON.parse(textContent) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>)['kind'] === 'case_resolver_node_file_snapshot_v1'
    ) {
      const record = parsed as Record<string, unknown>;
      const parsedNodes = (
        Array.isArray(record['nodes']) ? record['nodes'] : []
      ) as CaseResolverNodeFileSnapshot['nodes'];
      const parsedEdges = (
        Array.isArray(record['edges']) ? record['edges'] : []
      ) as CaseResolverNodeFileSnapshot['edges'];
      const parsedNodeFileMeta =
        record['nodeFileMeta'] !== null &&
        typeof record['nodeFileMeta'] === 'object' &&
        !Array.isArray(record['nodeFileMeta'])
          ? (record['nodeFileMeta'] as CaseResolverNodeFileSnapshot['nodeFileMeta'])
          : {};
      const parsedNodeMeta =
        record['nodeMeta'] !== null &&
        typeof record['nodeMeta'] === 'object' &&
        !Array.isArray(record['nodeMeta'])
          ? (record['nodeMeta'] as NonNullable<CaseResolverNodeFileSnapshot['nodeMeta']>)
          : {};
      const parsedEdgeMeta =
        record['edgeMeta'] !== null &&
        typeof record['edgeMeta'] === 'object' &&
        !Array.isArray(record['edgeMeta'])
          ? (record['edgeMeta'] as NonNullable<CaseResolverNodeFileSnapshot['edgeMeta']>)
          : {};
      if (
        parsedNodes.length > 0 ||
        parsedEdges.length > 0 ||
        Object.keys(parsedNodeFileMeta).length > 0 ||
        Object.keys(parsedNodeMeta).length > 0 ||
        Object.keys(parsedEdgeMeta).length > 0
      ) {
        return {
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [...parsedNodes],
          edges: [...parsedEdges],
          nodeMeta: { ...parsedNodeMeta },
          edgeMeta: { ...parsedEdgeMeta },
          nodeFileMeta: { ...parsedNodeFileMeta },
        };
      }

      const legacyNode = record['node'];
      const legacyNodeId =
        typeof record['nodeId'] === 'string' && record['nodeId'].trim().length > 0
          ? record['nodeId'].trim()
          : '';
      const legacyNodes: CaseResolverNodeFileSnapshot['nodes'] =
        legacyNode && typeof legacyNode === 'object' && !Array.isArray(legacyNode)
          ? [legacyNode as CaseResolverNodeFileSnapshot['nodes'][number]]
          : [];
      const resolvedLegacyNodeId =
        legacyNodeId ||
        (legacyNodes[0] &&
        typeof legacyNodes[0].id === 'string' &&
        legacyNodes[0].id.trim().length > 0
          ? legacyNodes[0].id.trim()
          : '');
      const legacyEdges = (
        Array.isArray(record['connectedEdges']) ? record['connectedEdges'] : []
      ) as CaseResolverNodeFileSnapshot['edges'];
      const sourceFileId = sanitizeOptionalId(record['sourceFileId']);
      const sourceFileName =
        typeof record['sourceFileName'] === 'string' && record['sourceFileName'].trim().length > 0
          ? record['sourceFileName'].trim()
          : 'Linked document';
      const sourceFileType: 'document' | 'scanfile' =
        record['sourceFileType'] === 'scanfile' ? 'scanfile' : 'document';
      const legacyNodeFileMeta: CaseResolverNodeFileSnapshot['nodeFileMeta'] =
        sourceFileId && resolvedLegacyNodeId
          ? {
            [resolvedLegacyNodeId]: {
              fileId: sourceFileId,
              fileType: sourceFileType,
              fileName: sourceFileName,
            },
          }
          : {};

      return {
        kind: 'case_resolver_node_file_snapshot_v1',
        source: 'manual',
        nodes: [...legacyNodes],
        edges: [...legacyEdges],
        nodeMeta: {},
        edgeMeta: {},
        nodeFileMeta: { ...legacyNodeFileMeta },
      };
    }
  } catch {
    // fall through to empty snapshot
  }
  return createEmptyNodeFileSnapshot();
};

export const serializeNodeFileSnapshot = (snapshot: CaseResolverNodeFileSnapshot): string => {
  return JSON.stringify(snapshot);
};

export const upsertFileGraph = (
  workspace: CaseResolverWorkspace,
  fileId: string,
  graph: CaseResolverGraph
): CaseResolverWorkspace => {
  const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.id !== fileId) return file;
    return {
      ...file,
      graph: sanitizeGraph(graph),
      updatedAt: new Date().toISOString(),
    };
  });

  return normalizeCaseResolverWorkspace({
    ...workspace,
    files: nextFiles,
  });
};
