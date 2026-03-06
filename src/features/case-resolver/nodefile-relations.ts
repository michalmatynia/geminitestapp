import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverGraph,
  CaseResolverNodeFileRelationIndex,
} from '@/shared/contracts/case-resolver';

const hasInlineNodeFileSnapshotText = (asset: CaseResolverAssetFile): boolean =>
  asset.kind === 'node_file' &&
  typeof asset.textContent === 'string' &&
  asset.textContent.trim().length > 0;

const isCanonicalNodeFileAsset = (asset: CaseResolverAssetFile): boolean =>
  asset.kind === 'node_file' && !hasInlineNodeFileSnapshotText(asset);

const addUnique = (target: Record<string, string[]>, key: string, value: string): void => {
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

const recordsEqual = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key: string): boolean => left[key] === right[key]);
};

const mergeRelationMap = (
  target: Record<string, string[]>,
  source: Record<string, string[]>
): void => {
  Object.entries(source).forEach(([key, values]: [string, string[]]): void => {
    values.forEach((value: string): void => {
      addUnique(target, key, value);
    });
  });
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
      .map((node): string => (typeof node.id === 'string' ? node.id.trim() : ''))
      .filter(Boolean)
  );
  const validNodeFileAssetIds = new Set<string>(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => isCanonicalNodeFileAsset(asset))
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
  const nodeIdsByDocumentFileId: Record<string, string[]> = {};
  const nodeFileAssetIdsByDocumentFileId: Record<string, string[]> = {};
  const documentFileIdsByNodeFileAssetId: Record<string, string[]> = {};
  const nodeIdsByNodeFileAssetId: Record<string, string[]> = {};

  if (files) {
    files.forEach((file: CaseResolverFile): void => {
      const graph = file.graph;
      if (!graph) return;
      const relationIndex = buildCaseResolverNodeFileRelationIndex({
        graph,
        assets,
        files,
      });
      mergeRelationMap(nodeIdsByDocumentFileId, relationIndex.nodeIdsByDocumentFileId);
      mergeRelationMap(
        nodeFileAssetIdsByDocumentFileId,
        relationIndex.nodeFileAssetIdsByDocumentFileId
      );
      mergeRelationMap(
        documentFileIdsByNodeFileAssetId,
        relationIndex.documentFileIdsByNodeFileAssetId
      );
      mergeRelationMap(nodeIdsByNodeFileAssetId, relationIndex.nodeIdsByNodeFileAssetId);
    });
  }

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
      .map((node): string => (typeof node.id === 'string' ? node.id.trim() : ''))
      .filter(Boolean)
  );
  const validNodeFileAssetIds = new Set<string>(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => isCanonicalNodeFileAsset(asset))
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
    const sourceFileId = nextSourceByNode[nodeId] ?? '';
    if (!sourceFileId) return;
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
