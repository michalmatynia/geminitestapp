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
  sourceFormat: 'canonical' | 'legacy';
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

type CaseResolverNodeFileMetaEntry = ParsedNodeFileSnapshot['nodeFileMeta'][string];

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

const buildLegacyBindingKey = (
  assetId: string,
  nodeId: string,
  fileId: string
): string => `${assetId}::${nodeId}::${fileId}`;

const buildValidLegacyBindingKeySetFromFiles = (
  files: CaseResolverFile[] | null | undefined
): Set<string> => {
  const keySet = new Set<string>();
  if (!files || files.length === 0) return keySet;

  files.forEach((file: CaseResolverFile): void => {
    const sourceByNode = normalizeRecord(file.graph.documentSourceFileIdByNode);
    const nodeFileByNode = normalizeRecord(file.graph.nodeFileAssetIdByNode);
    Object.entries(nodeFileByNode).forEach(([nodeId, assetId]: [string, string]): void => {
      const documentFileId = sourceByNode[nodeId] ?? '';
      if (!documentFileId) return;
      keySet.add(buildLegacyBindingKey(assetId, nodeId, documentFileId));
    });
  });

  return keySet;
};

const normalizeNodeFileMetaRecord = (
  input: unknown
): ParsedNodeFileSnapshot['nodeFileMeta'] => {
  const normalized: ParsedNodeFileSnapshot['nodeFileMeta'] = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return normalized;
  }

  Object.entries(input as Record<string, unknown>).forEach(([nodeId, rawMeta]: [string, unknown]): void => {
    const normalizedNodeId = nodeId.trim();
    if (!normalizedNodeId) return;
    if (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta)) return;
    const metaRecord = rawMeta as Record<string, unknown>;
    const fileId = typeof metaRecord['fileId'] === 'string' ? metaRecord['fileId'].trim() : '';
    if (!fileId) return;
    const fileType = metaRecord['fileType'] === 'scanfile' ? 'scanfile' : 'document';
    const fileName =
      typeof metaRecord['fileName'] === 'string' && metaRecord['fileName'].trim().length > 0
        ? metaRecord['fileName'].trim()
        : 'Linked document';
    normalized[normalizedNodeId] = {
      fileId,
      fileType,
      fileName,
    };
  });

  return normalized;
};

const normalizeLegacyNodeFileSnapshotRecord = (
  record: Record<string, unknown>,
  assetId: string,
  validLegacyBindingKeySet: Set<string>,
  validDocumentFileIds: Set<string>
): {
  nodes: AiNode[];
  edges: Edge[];
  nodeFileMeta: ParsedNodeFileSnapshot['nodeFileMeta'];
} => {
  const legacyNode = record['node'];
  const legacyNodes: AiNode[] =
    legacyNode && typeof legacyNode === 'object' && !Array.isArray(legacyNode)
      ? [legacyNode as AiNode]
      : [];
  const legacyNodeId =
    typeof record['nodeId'] === 'string' && record['nodeId'].trim().length > 0
      ? record['nodeId'].trim()
      : '';
  const resolvedLegacyNodeId =
    legacyNodeId ||
    (
      legacyNodes[0] &&
      typeof legacyNodes[0].id === 'string' &&
      legacyNodes[0].id.trim().length > 0
        ? legacyNodes[0].id.trim()
        : ''
    );
  const legacyEdges = (Array.isArray(record['connectedEdges']) ? record['connectedEdges'] : []) as Edge[];
  const sourceFileId =
    typeof record['sourceFileId'] === 'string' ? record['sourceFileId'].trim() : '';
  const sourceFileType: 'document' | 'scanfile' =
    record['sourceFileType'] === 'scanfile' ? 'scanfile' : 'document';
  const sourceFileName =
    typeof record['sourceFileName'] === 'string' && record['sourceFileName'].trim().length > 0
      ? record['sourceFileName'].trim()
      : 'Linked document';
  const nodeFileMeta: ParsedNodeFileSnapshot['nodeFileMeta'] = {};

  if (!resolvedLegacyNodeId || !sourceFileId || !validDocumentFileIds.has(sourceFileId)) {
    return {
      nodes: legacyNodes,
      edges: legacyEdges,
      nodeFileMeta,
    };
  }

  const legacyBindingKey = buildLegacyBindingKey(assetId, resolvedLegacyNodeId, sourceFileId);
  if (!validLegacyBindingKeySet.has(legacyBindingKey)) {
    return {
      nodes: legacyNodes,
      edges: legacyEdges,
      nodeFileMeta,
    };
  }

  nodeFileMeta[resolvedLegacyNodeId] = {
    fileId: sourceFileId,
    fileType: sourceFileType,
    fileName: sourceFileName,
  };

  return {
    nodes: legacyNodes,
    edges: legacyEdges,
    nodeFileMeta,
  };
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
    const nodeFileMeta = normalizeNodeFileMetaRecord(record['nodeFileMeta']);

    if (Object.keys(nodeFileMeta).length > 0 || nodes.length > 0 || edges.length > 0) {
      return {
        sourceFormat: 'canonical',
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
      sourceFormat: 'legacy',
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
  files = null,
}: {
  assets: CaseResolverAssetFile[];
  files?: CaseResolverFile[] | null;
}): CaseResolverNodeFileRelationIndex => {
  const validDocumentFileIds = files
    ? new Set<string>(
      files
        .filter((file: CaseResolverFile): boolean => file.fileType !== 'case')
        .map((file: CaseResolverFile): string => file.id.trim())
        .filter(Boolean)
    )
    : null;
  const validLegacyBindingKeySet =
    files && files.length > 0 ? buildValidLegacyBindingKeySetFromFiles(files) : null;
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
      if (validDocumentFileIds && !validDocumentFileIds.has(fileId)) return;
      if (snapshot.sourceFormat === 'legacy' && validLegacyBindingKeySet) {
        const legacyBindingKey = buildLegacyBindingKey(assetId, normalizedNodeId, fileId);
        if (!validLegacyBindingKeySet.has(legacyBindingKey)) {
          return;
        }
      }
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

export const sanitizeCaseResolverNodeFileAssetSnapshots = ({
  assets,
  files,
}: {
  assets: CaseResolverAssetFile[];
  files: CaseResolverFile[];
}): CaseResolverAssetFile[] => {
  if (assets.length === 0) return assets;

  const validDocumentFileIds = new Set<string>(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType !== 'case')
      .map((file: CaseResolverFile): string => file.id.trim())
      .filter(Boolean)
  );
  const validLegacyBindingKeySet = buildValidLegacyBindingKeySetFromFiles(files);
  const now = new Date().toISOString();
  let changed = false;

  const nextAssets = assets.map((asset: CaseResolverAssetFile): CaseResolverAssetFile => {
    if (asset.kind !== 'node_file') return asset;
    const rawText = typeof asset.textContent === 'string' ? asset.textContent.trim() : '';
    if (!rawText) return asset;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      return asset;
    }
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>)['kind'] !== 'case_resolver_node_file_snapshot_v1'
    ) {
      return asset;
    }

    const record = parsed as Record<string, unknown>;
    const hasCanonicalMeta =
      record['nodeFileMeta'] !== null &&
      typeof record['nodeFileMeta'] === 'object' &&
      !Array.isArray(record['nodeFileMeta']);
    const parsedNodes = (Array.isArray(record['nodes']) ? record['nodes'] : []) as AiNode[];
    const parsedEdges = (Array.isArray(record['edges']) ? record['edges'] : []) as Edge[];

    let normalizedNodeFileMeta: ParsedNodeFileSnapshot['nodeFileMeta'] = {};

    if (hasCanonicalMeta) {
      const canonicalMeta = normalizeNodeFileMetaRecord(record['nodeFileMeta']);
      Object.entries(canonicalMeta).forEach(([nodeId, meta]: [string, CaseResolverNodeFileMetaEntry]): void => {
        if (!validDocumentFileIds.has(meta.fileId)) return;
        normalizedNodeFileMeta[nodeId] = meta;
      });
    } else {
      const normalizedLegacy = normalizeLegacyNodeFileSnapshotRecord(
        record,
        asset.id,
        validLegacyBindingKeySet,
        validDocumentFileIds
      );
      normalizedNodeFileMeta = normalizedLegacy.nodeFileMeta;
    }

    const nextSnapshotRecord = {
      kind: 'case_resolver_node_file_snapshot_v1',
      source:
        typeof record['source'] === 'string' && record['source'].trim().length > 0
          ? record['source'].trim()
          : 'manual',
      nodes: parsedNodes,
      edges: parsedEdges,
      nodeFileMeta: normalizedNodeFileMeta,
    };
    const nextTextContent = JSON.stringify(nextSnapshotRecord);
    const nextSourceFileId: string | null = (() => {
      const fileIds = Array.from(
        new Set(
          Object.values(normalizedNodeFileMeta)
            .map((meta: CaseResolverNodeFileMetaEntry): string => meta.fileId)
            .filter(Boolean)
        )
      );
      return fileIds.length === 1 ? (fileIds[0] ?? null) : null;
    })();

    if (nextTextContent === rawText && (asset.sourceFileId ?? null) === nextSourceFileId) {
      return asset;
    }
    changed = true;
    return {
      ...asset,
      textContent: nextTextContent,
      sourceFileId: nextSourceFileId,
      updatedAt: now,
    };
  });

  return changed ? nextAssets : assets;
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
