import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from './types';

const FOLDER_NODE_PREFIX = 'folder:';
const FILE_NODE_PREFIX = 'file:';
const ASSET_NODE_PREFIX = 'asset:';

export type CaseResolverMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'file'; id: string; nodeId: string }
  | { entity: 'asset'; id: string; nodeId: string };

export const toCaseResolverFolderNodeId = (folderPath: string): string =>
  `${FOLDER_NODE_PREFIX}${folderPath}`;

export const toCaseResolverFileNodeId = (fileId: string): string =>
  `${FILE_NODE_PREFIX}${fileId}`;

export const toCaseResolverAssetNodeId = (assetId: string): string =>
  `${ASSET_NODE_PREFIX}${assetId}`;

export const fromCaseResolverFolderNodeId = (value: string): string | null =>
  value.startsWith(FOLDER_NODE_PREFIX) ? value.slice(FOLDER_NODE_PREFIX.length) : null;

export const fromCaseResolverFileNodeId = (value: string): string | null =>
  value.startsWith(FILE_NODE_PREFIX) ? value.slice(FILE_NODE_PREFIX.length) : null;

export const fromCaseResolverAssetNodeId = (value: string): string | null =>
  value.startsWith(ASSET_NODE_PREFIX) ? value.slice(ASSET_NODE_PREFIX.length) : null;

export const decodeCaseResolverMasterNodeId = (
  value: string
): CaseResolverMasterNodeRef | null => {
  const folderId = fromCaseResolverFolderNodeId(value);
  if (folderId !== null) return { entity: 'folder', id: folderId, nodeId: value };
  const fileId = fromCaseResolverFileNodeId(value);
  if (fileId !== null) return { entity: 'file', id: fileId, nodeId: value };
  const assetId = fromCaseResolverAssetNodeId(value);
  if (assetId !== null) return { entity: 'asset', id: assetId, nodeId: value };
  return null;
};

const parentFolderPath = (folderPath: string): string | null => {
  if (!folderPath.includes('/')) return null;
  return folderPath.slice(0, folderPath.lastIndexOf('/'));
};

export const resolveCaseResolverFolderTargetForNode = (
  nodes: MasterTreeNode[],
  nodeId: MasterTreeId | null
): string | null => {
  if (nodeId === null) return '';
  const folderPath = fromCaseResolverFolderNodeId(nodeId);
  if (folderPath !== null) return folderPath;
  const node = nodes.find((entry: MasterTreeNode) => entry.id === nodeId);
  if (!node?.parentId) return '';
  return resolveCaseResolverFolderTargetForNode(nodes, node.parentId);
};

export const buildMasterNodesFromCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];
  const folderTimestampByPath = workspace.folderTimestamps ?? {};
  const resolveParentKey = (parentId: string | null): string => parentId ?? '__root__';
  const folderSortIndexByParent = new Map<string, number>();

  const sortedFolders = [...workspace.folders].sort((left: string, right: string) =>
    left.localeCompare(right)
  );

  sortedFolders.forEach((folderPath: string) => {
    const folderNodeId = toCaseResolverFolderNodeId(folderPath);
    const parentPath = parentFolderPath(folderPath);
    const parentNodeId = parentPath ? toCaseResolverFolderNodeId(parentPath) : null;
    const parentKey = resolveParentKey(parentNodeId);
    const folderSortOrder = folderSortIndexByParent.get(parentKey) ?? 0;
    folderSortIndexByParent.set(parentKey, folderSortOrder + 1);
    const folderName = folderPath.includes('/')
      ? folderPath.slice(folderPath.lastIndexOf('/') + 1)
      : folderPath;

    nodes.push({
      id: folderNodeId,
      type: 'folder',
      kind: 'folder',
      parentId: parentNodeId,
      name: folderName,
      path: folderPath,
      sortOrder: folderSortOrder,
      metadata: {
        entity: 'folder',
        rawPath: folderPath,
        createdAt: folderTimestampByPath[folderPath]?.createdAt ?? null,
        updatedAt: folderTimestampByPath[folderPath]?.updatedAt ?? null,
      },
    });
  });

  type FolderFileEntry = {
    id: string;
    name: string;
    kindSortKey: string;
    toNode: (sortOrder: number, parentNodeId: string | null) => MasterTreeNode;
  };
  const fileEntriesByFolder = new Map<string, FolderFileEntry[]>();
  const appendFileEntry = (folderPath: string, entry: FolderFileEntry): void => {
    const current = fileEntriesByFolder.get(folderPath) ?? [];
    current.push(entry);
    fileEntriesByFolder.set(folderPath, current);
  };

  workspace.files.forEach((file: CaseResolverFile) => {
    if (file.fileType === 'case') return;
    const isScanFile = file.fileType === 'scanfile';
    appendFileEntry(file.folder, {
      id: file.id,
      name: file.name,
      kindSortKey: isScanFile ? 'case_file_scan' : 'case_file_document',
      toNode: (sortOrder: number, parentNodeId: string | null): MasterTreeNode => {
        const filePath = file.folder ? `${file.folder}/${file.name}` : file.name;
        return {
          id: toCaseResolverFileNodeId(file.id),
          type: 'file',
          kind: isScanFile ? 'case_file_scan' : 'case_file',
          parentId: parentNodeId,
          name: file.name,
          path: filePath,
          sortOrder,
          metadata: {
            entity: 'file',
            rawId: file.id,
            folder: file.folder,
            isLocked: file.isLocked,
            fileType: file.fileType,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          },
        };
      },
    });
  });
  workspace.assets.forEach((asset: CaseResolverAssetFile) => {
    const isHiddenImagePlaceholder =
      asset.kind === 'image' &&
      (typeof asset.filepath !== 'string' || asset.filepath.trim().length === 0);
    if (isHiddenImagePlaceholder) return;

    appendFileEntry(asset.folder, {
      id: asset.id,
      name: asset.name,
      kindSortKey:
        asset.kind === 'node_file'
          ? 'node_file'
          : asset.kind === 'image'
            ? 'asset_image'
            : asset.kind === 'pdf'
              ? 'asset_pdf'
              : 'asset_file',
      toNode: (sortOrder: number, parentNodeId: string | null): MasterTreeNode => {
        const assetPath = asset.folder ? `${asset.folder}/${asset.name}` : asset.name;
        const kind =
          asset.kind === 'node_file'
            ? 'node_file'
            : asset.kind === 'image'
              ? 'asset_image'
              : asset.kind === 'pdf'
                ? 'asset_pdf'
                : 'asset_file';

        return {
          id: toCaseResolverAssetNodeId(asset.id),
          type: 'file',
          kind,
          parentId: parentNodeId,
          name: asset.name,
          path: assetPath,
          sortOrder,
          metadata: {
            entity: 'asset',
            rawId: asset.id,
            folder: asset.folder,
            assetKind: asset.kind,
            filepath: asset.filepath,
            mimeType: asset.mimeType,
            size: asset.size,
            textContent: asset.textContent,
            description: asset.description,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          },
        };
      },
    });
  });

  fileEntriesByFolder.forEach((entries: FolderFileEntry[], folderPath: string) => {
    const parentNodeId = folderPath ? toCaseResolverFolderNodeId(folderPath) : null;
    const sortedEntries = [...entries].sort((left: FolderFileEntry, right: FolderFileEntry) => {
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) return nameDelta;
      const kindDelta = left.kindSortKey.localeCompare(right.kindSortKey);
      if (kindDelta !== 0) return kindDelta;
      return left.id.localeCompare(right.id);
    });

    sortedEntries.forEach((entry: FolderFileEntry, index: number) => {
      nodes.push(entry.toNode(10000 + index, parentNodeId));
    });
  });

  return nodes;
};
