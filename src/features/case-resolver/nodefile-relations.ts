import type {
  AiNode,
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverGraph,
  Edge,
} from './types';

export type CaseResolverNodeFileRelationIndex = {
  nodeIdsByDocumentFileId: Record<string, string[]>;
  nodeFileAssetIdsByDocumentFileId: Record<string, string[]>;
  documentFileIdsByNodeFileAssetId: Record<string, string[]>;
  nodeIdsByNodeFileAssetId: Record<string, string[]>;
};

export const EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX: CaseResolverNodeFileRelationIndex = {
  nodeIdsByDocumentFileId: {},
  nodeFileAssetIdsByDocumentFileId: {},
  documentFileIdsByNodeFileAssetId: {},
  nodeIdsByNodeFileAssetId: {},
};

type ParsedNodeFileSnapshot = {
  nodes: AiNode[];
  edges: Edge[];
  nodeFileMeta: Record<
    string,
    {
      fileId: string;
      fileType: 'document' | 'scanfile';
      fileName: string;
    }
  >;
};

const addUnique = (
  target: Record<string, string[]>,
  key: string,
  value: string
): void => {
  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  if (!normalizedKey || !normalizedValue) return;
  const current = target[normalizedKey] ?? [];
  if (current.includes(normalizedValue)) return;
  target[normalizedKey] = [...current, normalizedValue];
};

const sortRecordValues = (input: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(input).map(([key, values]: [string, string[]]) => [
      key,
      [...values].sort((left: string, right: string) => left.localeCompare(right)),
    ])
  );

const normalizeRecord = (input: Record<string, string> | undefined): Record<string, string> => {
  if (!input) return {};
  const normalized: Record<string, string> = {};
  Object.entries(input).forEach(([key, value]: [string, string]): void => {
    const normalizedKey = key.trim();
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    if (!normalizedKey || !normalizedValue) return;
    normalized[normalizedKey] = normalizedValue;
  });
  return normalized;
};

const recordsEqual = (
  left: Record<string, string>,
  right: Record<string, string>
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key: string): boolean => left[key] === right[key]);
};

const parseNodeFileSnapshotFromAsset = (
  asset: CaseResolverAssetFile
): ParsedNodeFileSnapshot | null => {
  if (asset.kind !== 'node_file') return null;
  const rawText = typeof asset.textContent === 'string' ? asset.textContent.trim() : '';
  if (!rawText) return null;

  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>)['kind'] !== 'case_resolver_node_file_snapshot_v1'
    ) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const nodes = (Array.isArray(record['nodes']) ? record['nodes'] : []) as AiNode[];
    const edges = (Array.isArray(record['edges']) ? record['edges'] : []) as Edge[];
    const nodeFileMetaInput =
      record['nodeFileMeta'] &&
      typeof record['nodeFileMeta'] === 'object' &&
      !Array.isArray(record['nodeFileMeta'])
        ? (record['nodeFileMeta'] as Record<string, unknown>)
        : {};
    const nodeFileMeta: ParsedNodeFileSnapshot['nodeFileMeta'] = {};

    Object.entries(nodeFileMetaInput).forEach(([nodeId, rawMeta]: [string, unknown]): void => {
      const normalizedNodeId = nodeId.trim();
      if (!normalizedNodeId) return;
      if (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta)) return;
      const metaRecord = rawMeta as Record<string, unknown>;
      const fileId =
        typeof metaRecord['fileId'] === 'string' ? metaRecord['fileId'].trim() : '';
      if (!fileId) return;
      const fileType =
        metaRecord['fileType'] === 'scanfile' ? 'scanfile' : 'document';
      const fileName =
        typeof metaRecord['fileName'] === 'string' && metaRecord['fileName'].trim().length > 0
          ? metaRecord['fileName'].trim()
          : 'Linked document';
      nodeFileMeta[normalizedNodeId] = {
        fileId,
        fileType,
        fileName,
      };
    });

    if (Object.keys(nodeFileMeta).length > 0 || nodes.length > 0 || edges.length > 0) {
      return {
        nodes,
        edges,
        nodeFileMeta,
      };
    }

    const legacyNodeId =
      typeof record['nodeId'] === 'string' && record['nodeId'].trim().length > 0
        ? record['nodeId'].trim()
        : '';
    const legacySourceFileId =
      typeof record['sourceFileId'] === 'string' && record['sourceFileId'].trim().length > 0
        ? record['sourceFileId'].trim()
        : '';
    if (!legacyNodeId || !legacySourceFileId) {
      return null;
    }
    const legacyFileType =
      record['sourceFileType'] === 'scanfile' ? 'scanfile' : 'document';
    const legacyFileName =
      typeof record['sourceFileName'] === 'string' && record['sourceFileName'].trim().length > 0
        ? record['sourceFileName'].trim()
        : 'Linked document';
    return {
      nodes: [],
      edges: [],
      nodeFileMeta: {
        [legacyNodeId]: {
          fileId: legacySourceFileId,
          fileType: legacyFileType,
          fileName: legacyFileName,
        },
      },
    };
  } catch {
    return null;
  }
};

export const buildCaseResolverNodeFileRelationIndex = ({
  graph,
  assets,
  files,
}: {
  graph: CaseResolverGraph;
  assets: CaseResolverAssetFile[];
  files?: CaseResolverFile[] | null;
}): CaseResolverNodeFileRelationIndex => {
  const validNodeIds = new Set<string>(
    graph.nodes
      .map((node): string =>
        typeof node.id === 'string' ? node.id.trim() : ''
      )
      .filter(Boolean)
  );
  const validNodeFileAssetIds = new Set<string>(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => asset.kind === 'node_file')
      .map((asset: CaseResolverAssetFile): string => asset.id.trim())
      .filter(Boolean)
  );
  const validDocumentFileIds = files
    ? new Set(
      files
        .filter((file: CaseResolverFile): boolean => file.fileType !== 'case')
        .map((file: CaseResolverFile): string => file.id.trim())
        .filter(Boolean)
    )
    : null;

  const sourceByNode = normalizeRecord(graph.documentSourceFileIdByNode);
  const nodeFileByNode = normalizeRecord(graph.nodeFileAssetIdByNode);

  const nodeIdsByDocumentFileId: Record<string, string[]> = {};
  const nodeFileAssetIdsByDocumentFileId: Record<string, string[]> = {};
  const documentFileIdsByNodeFileAssetId: Record<string, string[]> = {};
  const nodeIdsByNodeFileAssetId: Record<string, string[]> = {};

  graph.nodes.forEach((node): void => {
    const nodeId = typeof node.id === 'string' ? node.id.trim() : '';
    if (!nodeId || !validNodeIds.has(nodeId)) return;

    const documentFileId = sourceByNode[nodeId] ?? '';
    const nodeFileAssetId = nodeFileByNode[nodeId] ?? '';

    const documentFileIsValid =
      documentFileId.length > 0 &&
      (validDocumentFileIds === null || validDocumentFileIds.has(documentFileId));
    const nodeFileAssetIsValid =
      nodeFileAssetId.length > 0 && validNodeFileAssetIds.has(nodeFileAssetId);

    if (documentFileIsValid) {
      addUnique(nodeIdsByDocumentFileId, documentFileId, nodeId);
    }

    if (nodeFileAssetIsValid) {
      addUnique(nodeIdsByNodeFileAssetId, nodeFileAssetId, nodeId);
    }

    if (!documentFileIsValid || !nodeFileAssetIsValid) return;

    addUnique(nodeFileAssetIdsByDocumentFileId, documentFileId, nodeFileAssetId);
    addUnique(documentFileIdsByNodeFileAssetId, nodeFileAssetId, documentFileId);
  });

  return {
    nodeIdsByDocumentFileId: sortRecordValues(nodeIdsByDocumentFileId),
    nodeFileAssetIdsByDocumentFileId: sortRecordValues(nodeFileAssetIdsByDocumentFileId),
    documentFileIdsByNodeFileAssetId: sortRecordValues(documentFileIdsByNodeFileAssetId),
    nodeIdsByNodeFileAssetId: sortRecordValues(nodeIdsByNodeFileAssetId),
  };
};

export const buildCaseResolverNodeFileRelationIndexFromAssets = ({
  assets,
}: {
  assets: CaseResolverAssetFile[];
}): CaseResolverNodeFileRelationIndex => {
  const nodeIdsByDocumentFileId: Record<string, string[]> = {};
  const nodeFileAssetIdsByDocumentFileId: Record<string, string[]> = {};
  const documentFileIdsByNodeFileAssetId: Record<string, string[]> = {};
  const nodeIdsByNodeFileAssetId: Record<string, string[]> = {};

  assets.forEach((asset: CaseResolverAssetFile): void => {
    if (asset.kind !== 'node_file') return;
    const snapshot = parseNodeFileSnapshotFromAsset(asset);
    if (!snapshot) return;
    const assetId = asset.id.trim();
    if (!assetId) return;

    Object.entries(snapshot.nodeFileMeta).forEach(([nodeId, meta]): void => {
      const normalizedNodeId = nodeId.trim();
      if (!normalizedNodeId) return;
      const fileId = meta.fileId.trim();
      if (!fileId) return;
      addUnique(nodeIdsByDocumentFileId, fileId, normalizedNodeId);
      addUnique(nodeFileAssetIdsByDocumentFileId, fileId, assetId);
      addUnique(documentFileIdsByNodeFileAssetId, assetId, fileId);
      addUnique(nodeIdsByNodeFileAssetId, assetId, normalizedNodeId);
    });
  });

  return {
    nodeIdsByDocumentFileId: sortRecordValues(nodeIdsByDocumentFileId),
    nodeFileAssetIdsByDocumentFileId: sortRecordValues(nodeFileAssetIdsByDocumentFileId),
    documentFileIdsByNodeFileAssetId: sortRecordValues(documentFileIdsByNodeFileAssetId),
    nodeIdsByNodeFileAssetId: sortRecordValues(nodeIdsByNodeFileAssetId),
  };
};

export const sanitizeCaseResolverGraphNodeFileRelations = ({
  graph,
  assets,
  files,
}: {
  graph: CaseResolverGraph;
  assets: CaseResolverAssetFile[];
  files: CaseResolverFile[];
}): CaseResolverGraph => {
  const validNodeIds = new Set<string>(
    graph.nodes
      .map((node): string =>
        typeof node.id === 'string' ? node.id.trim() : ''
      )
      .filter(Boolean)
  );
  const validNodeFileAssetIds = new Set<string>(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => asset.kind === 'node_file')
      .map((asset: CaseResolverAssetFile): string => asset.id.trim())
      .filter(Boolean)
  );
  const validDocumentFileIds = new Set<string>(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType !== 'case')
      .map((file: CaseResolverFile): string => file.id.trim())
      .filter(Boolean)
  );

  const currentSourceByNode = normalizeRecord(graph.documentSourceFileIdByNode);
  const currentNodeFileByNode = normalizeRecord(graph.nodeFileAssetIdByNode);

  const nextSourceByNode: Record<string, string> = {};
  Object.entries(currentSourceByNode).forEach(([nodeId, fileId]: [string, string]): void => {
    if (!validNodeIds.has(nodeId)) return;
    if (!validDocumentFileIds.has(fileId)) return;
    nextSourceByNode[nodeId] = fileId;
  });

  const nextNodeFileByNode: Record<string, string> = {};
  Object.entries(currentNodeFileByNode).forEach(([nodeId, assetId]: [string, string]): void => {
    if (!validNodeIds.has(nodeId)) return;
    if (!validNodeFileAssetIds.has(assetId)) return;
    nextNodeFileByNode[nodeId] = assetId;
  });

  if (
    recordsEqual(currentSourceByNode, nextSourceByNode) &&
    recordsEqual(currentNodeFileByNode, nextNodeFileByNode)
  ) {
    return graph;
  }

  return {
    ...graph,
    documentSourceFileIdByNode: nextSourceByNode,
    nodeFileAssetIdByNode: nextNodeFileByNode,
  };
};
