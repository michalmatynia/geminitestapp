import type { CaseResolverAssetFile, CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverGraph, CaseResolverNodeFileRelationIndex } from '@/shared/contracts/case-resolver/graph';
import {
  isCanonicalNodeFileAsset,
  addUnique,
  sortRecordValues,
  normalizeRecord,
  recordsEqual,
  mergeRelationMap,
} from '@/features/case-resolver/services/node-file-relations';

type RelationIndexMaps = {
  documentFileIdsByNodeFileAssetId: Record<string, string[]>;
  nodeFileAssetIdsByDocumentFileId: Record<string, string[]>;
  nodeIdsByDocumentFileId: Record<string, string[]>;
  nodeIdsByNodeFileAssetId: Record<string, string[]>;
};

const getTrimmedNodeId = (node: CaseResolverGraph['nodes'][number]): string =>
  typeof node.id === 'string' ? node.id.trim() : '';

const getValidNodeIds = (graph: CaseResolverGraph): Set<string> =>
  new Set<string>(
    graph.nodes
      .map((node): string => getTrimmedNodeId(node))
      .filter((nodeId: string): boolean => nodeId.length > 0)
  );

const getValidNodeFileAssetIds = (assets: CaseResolverAssetFile[]): Set<string> =>
  new Set<string>(
    assets
      .filter((asset: CaseResolverAssetFile): boolean => isCanonicalNodeFileAsset(asset))
      .map((asset: CaseResolverAssetFile): string => asset.id.trim())
      .filter((assetId: string): boolean => assetId.length > 0)
  );

const getValidDocumentFileIds = (
  files?: CaseResolverFile[] | null
): Set<string> | null => {
  if (files === undefined || files === null) return null;
  return new Set<string>(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType !== 'case')
      .map((file: CaseResolverFile): string => file.id.trim())
      .filter((fileId: string): boolean => fileId.length > 0)
  );
};

const createRelationIndexMaps = (): RelationIndexMaps => ({
  nodeIdsByDocumentFileId: {},
  nodeFileAssetIdsByDocumentFileId: {},
  documentFileIdsByNodeFileAssetId: {},
  nodeIdsByNodeFileAssetId: {},
});

const toRelationIndex = (maps: RelationIndexMaps): CaseResolverNodeFileRelationIndex => ({
  nodeIdsByDocumentFileId: sortRecordValues(maps.nodeIdsByDocumentFileId),
  nodeFileAssetIdsByDocumentFileId: sortRecordValues(maps.nodeFileAssetIdsByDocumentFileId),
  documentFileIdsByNodeFileAssetId: sortRecordValues(maps.documentFileIdsByNodeFileAssetId),
  nodeIdsByNodeFileAssetId: sortRecordValues(maps.nodeIdsByNodeFileAssetId),
});

const isKnownDocumentFileId = (
  fileId: string,
  validDocumentFileIds: Set<string> | null
): boolean => {
  if (fileId.length === 0) return false;
  return validDocumentFileIds === null || validDocumentFileIds.has(fileId);
};

const isKnownNodeFileAssetId = (
  assetId: string,
  validNodeFileAssetIds: Set<string>
): boolean => assetId.length > 0 && validNodeFileAssetIds.has(assetId);

const addNodeRelationLinks = ({
  documentFileId,
  maps,
  nodeFileAssetId,
  nodeId,
  validDocumentFileIds,
  validNodeFileAssetIds,
}: {
  documentFileId: string;
  maps: RelationIndexMaps;
  nodeFileAssetId: string;
  nodeId: string;
  validDocumentFileIds: Set<string> | null;
  validNodeFileAssetIds: Set<string>;
}): void => {
  const documentFileIsValid = isKnownDocumentFileId(documentFileId, validDocumentFileIds);
  const nodeFileAssetIsValid = isKnownNodeFileAssetId(nodeFileAssetId, validNodeFileAssetIds);

  if (documentFileIsValid) {
    addUnique(maps.nodeIdsByDocumentFileId, documentFileId, nodeId);
  }

  if (nodeFileAssetIsValid) {
    addUnique(maps.nodeIdsByNodeFileAssetId, nodeFileAssetId, nodeId);
  }

  if (!documentFileIsValid || !nodeFileAssetIsValid) return;

  addUnique(maps.nodeFileAssetIdsByDocumentFileId, documentFileId, nodeFileAssetId);
  addUnique(maps.documentFileIdsByNodeFileAssetId, nodeFileAssetId, documentFileId);
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
  const validNodeIds = getValidNodeIds(graph);
  const validNodeFileAssetIds = getValidNodeFileAssetIds(assets);
  const validDocumentFileIds = getValidDocumentFileIds(files);
  const sourceByNode = normalizeRecord(graph.documentSourceFileIdByNode);
  const nodeFileByNode = normalizeRecord(graph.nodeFileAssetIdByNode);
  const maps = createRelationIndexMaps();

  graph.nodes.forEach((node): void => {
    const nodeId = getTrimmedNodeId(node);
    if (nodeId.length === 0 || !validNodeIds.has(nodeId)) return;

    const documentFileId = sourceByNode[nodeId] ?? '';
    const nodeFileAssetId = nodeFileByNode[nodeId] ?? '';
    addNodeRelationLinks({
      documentFileId,
      maps,
      nodeFileAssetId,
      nodeId,
      validDocumentFileIds,
      validNodeFileAssetIds,
    });
  });

  return toRelationIndex(maps);
};

export const buildCaseResolverNodeFileRelationIndexFromAssets = ({
  assets,
  files = null,
}: {
  assets: CaseResolverAssetFile[];
  files?: CaseResolverFile[] | null;
}): CaseResolverNodeFileRelationIndex => {
  const maps = createRelationIndexMaps();

  if (files !== null) {
    files.forEach((file: CaseResolverFile): void => {
      const graph = file.graph;
      if (!graph) return;
      const relationIndex = buildCaseResolverNodeFileRelationIndex({
        graph,
        assets,
        files,
      });
      mergeRelationMap(maps.nodeIdsByDocumentFileId, relationIndex.nodeIdsByDocumentFileId);
      mergeRelationMap(
        maps.nodeFileAssetIdsByDocumentFileId,
        relationIndex.nodeFileAssetIdsByDocumentFileId
      );
      mergeRelationMap(
        maps.documentFileIdsByNodeFileAssetId,
        relationIndex.documentFileIdsByNodeFileAssetId
      );
      mergeRelationMap(maps.nodeIdsByNodeFileAssetId, relationIndex.nodeIdsByNodeFileAssetId);
    });
  }

  return toRelationIndex(maps);
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
  const validNodeIds = getValidNodeIds(graph);
  const validNodeFileAssetIds = getValidNodeFileAssetIds(assets);
  const validDocumentFileIds = getValidDocumentFileIds(files) ?? new Set<string>();
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
    if (sourceFileId.length === 0) return;
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
