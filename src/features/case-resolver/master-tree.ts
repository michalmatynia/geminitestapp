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

  const sortedFolders = [...workspace.folders].sort((left: string, right: string) =>
    left.localeCompare(right)
  );

  sortedFolders.forEach((folderPath: string, index: number) => {
    const folderNodeId = toCaseResolverFolderNodeId(folderPath);
    const parentPath = parentFolderPath(folderPath);
    const parentNodeId = parentPath ? toCaseResolverFolderNodeId(parentPath) : null;
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
      sortOrder: index,
      metadata: {
        entity: 'folder',
        rawPath: folderPath,
      },
    });
  });

  const filesByFolder = new Map<string, CaseResolverFile[]>();
  workspace.files.forEach((file: CaseResolverFile) => {
    const list = filesByFolder.get(file.folder) ?? [];
    list.push(file);
    filesByFolder.set(file.folder, list);
  });

  Array.from(filesByFolder.entries()).forEach(([folderPath, files]: [string, CaseResolverFile[]]) => {
    const sortedFiles = [...files].sort((left: CaseResolverFile, right: CaseResolverFile) =>
      left.name.localeCompare(right.name)
    );
    const parentNodeId = folderPath ? toCaseResolverFolderNodeId(folderPath) : null;

    sortedFiles.forEach((file: CaseResolverFile, fileIndex: number) => {
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
      nodes.push({
        id: toCaseResolverFileNodeId(file.id),
        type: 'file',
        kind: 'case_file',
        parentId: parentNodeId,
        name: file.name,
        path: filePath,
        sortOrder: fileIndex,
        metadata: {
          entity: 'file',
          rawId: file.id,
          folder: file.folder,
        },
      });
    });
  });

  const assetsByFolder = new Map<string, CaseResolverAssetFile[]>();
  workspace.assets.forEach((asset: CaseResolverAssetFile) => {
    const list = assetsByFolder.get(asset.folder) ?? [];
    list.push(asset);
    assetsByFolder.set(asset.folder, list);
  });

  Array.from(assetsByFolder.entries()).forEach(([folderPath, assets]: [string, CaseResolverAssetFile[]]) => {
    const sortedAssets = [...assets].sort((left: CaseResolverAssetFile, right: CaseResolverAssetFile) =>
      left.name.localeCompare(right.name)
    );
    const parentNodeId = folderPath ? toCaseResolverFolderNodeId(folderPath) : null;

    sortedAssets.forEach((asset: CaseResolverAssetFile, assetIndex: number) => {
      const assetPath = folderPath ? `${folderPath}/${asset.name}` : asset.name;
      const kind =
        asset.kind === 'node_file'
          ? 'node_file'
          : asset.kind === 'image'
            ? 'asset_image'
            : asset.kind === 'pdf'
              ? 'asset_pdf'
              : 'asset_file';

      nodes.push({
        id: toCaseResolverAssetNodeId(asset.id),
        type: 'file',
        kind,
        parentId: parentNodeId,
        name: asset.name,
        path: assetPath,
        sortOrder: 10000 + assetIndex,
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
        },
      });
    });
  });

  return nodes;
};
