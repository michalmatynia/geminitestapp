import type { PathMeta } from '@/shared/contracts/ai-paths';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { normalizeTreePath } from '@/shared/utils/tree-operations';
import { normalizeAiPathFolderPath } from '@/shared/lib/ai-paths/core/utils/path-folders';

const FOLDER_NODE_PREFIX = 'ai-path-folder:';
const PATH_NODE_PREFIX = 'ai-path:';

type AiPathsTreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'path';
  path: string;
  pathId?: string;
  children: AiPathsTreeNode[];
};

export type AiPathMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'path'; id: string; nodeId: string };

export const toAiPathFolderNodeId = (folderPath: string): string =>
  `${FOLDER_NODE_PREFIX}${normalizeTreePath(folderPath)}`;

export const toAiPathNodeId = (pathId: string): string => `${PATH_NODE_PREFIX}${pathId}`;

export const fromAiPathFolderNodeId = (value: string): string | null =>
  value.startsWith(FOLDER_NODE_PREFIX)
    ? normalizeTreePath(value.slice(FOLDER_NODE_PREFIX.length))
    : null;

export const fromAiPathNodeId = (value: string): string | null =>
  value.startsWith(PATH_NODE_PREFIX) ? value.slice(PATH_NODE_PREFIX.length) : null;

export const decodeAiPathMasterNodeId = (value: string): AiPathMasterNodeRef | null => {
  const folderPath = fromAiPathFolderNodeId(value);
  if (folderPath !== null) {
    return { entity: 'folder', id: folderPath, nodeId: value };
  }
  const pathId = fromAiPathNodeId(value);
  if (pathId) {
    return { entity: 'path', id: pathId, nodeId: value };
  }
  return null;
};

const compareTreeNodes = (left: AiPathsTreeNode, right: AiPathsTreeNode): number => {
  if (left.type !== right.type) {
    return left.type === 'folder' ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
};

const comparePathMetas = (left: PathMeta, right: PathMeta): number => {
  const leftName = left.name?.trim() || left.id;
  const rightName = right.name?.trim() || right.id;
  return leftName.localeCompare(rightName);
};

const ensureFolderNode = (parent: AiPathsTreeNode, folderPath: string): AiPathsTreeNode => {
  const normalizedFolderPath = normalizeTreePath(folderPath);
  const folderName = normalizedFolderPath.split('/').filter(Boolean).pop() ?? normalizedFolderPath;
  const nodeId = toAiPathFolderNodeId(normalizedFolderPath);
  const existing = parent.children.find((child: AiPathsTreeNode): boolean => child.id === nodeId);
  if (existing) return existing;

  const created: AiPathsTreeNode = {
    id: nodeId,
    name: folderName,
    type: 'folder',
    path: normalizedFolderPath,
    children: [],
  };
  parent.children.push(created);
  parent.children.sort(compareTreeNodes);
  return created;
};

const buildAiPathsTreeRoot = (paths: PathMeta[]): AiPathsTreeNode => {
  const root: AiPathsTreeNode = {
    id: '__root__',
    name: 'root',
    type: 'folder',
    path: '',
    children: [],
  };

  [...paths].sort(comparePathMetas).forEach((pathMeta: PathMeta): void => {
    const folderPath = normalizeAiPathFolderPath(pathMeta.folderPath);
    const folderSegments = folderPath ? folderPath.split('/').filter(Boolean) : [];
    let cursor = root;
    for (let index = 0; index < folderSegments.length; index += 1) {
      cursor = ensureFolderNode(cursor, folderSegments.slice(0, index + 1).join('/'));
    }

    cursor.children.push({
      id: toAiPathNodeId(pathMeta.id),
      name: pathMeta.name?.trim() || `Path ${pathMeta.id.slice(0, 6)}`,
      type: 'path',
      path: normalizeTreePath(folderPath ? `${folderPath}/${pathMeta.id}` : pathMeta.id),
      pathId: pathMeta.id,
      children: [],
    });
    cursor.children.sort(compareTreeNodes);
  });

  return root;
};

export const buildMasterNodesFromAiPaths = (paths: PathMeta[]): MasterTreeNode[] => {
  const root = buildAiPathsTreeRoot(paths);
  const nodes: MasterTreeNode[] = [];

  const walk = (children: AiPathsTreeNode[], parentId: string | null): void => {
    children.forEach((child: AiPathsTreeNode, index: number): void => {
      if (child.type === 'folder') {
        nodes.push({
          id: child.id,
          type: 'folder',
          kind: 'folder',
          parentId,
          name: child.name,
          path: child.path,
          sortOrder: index,
          metadata: {
            entity: 'folder',
            folderPath: child.path,
          },
        });
      } else {
        nodes.push({
          id: child.id,
          type: 'file',
          kind: 'path',
          parentId,
          name: child.name,
          path: child.path,
          sortOrder: index,
          metadata: {
            entity: 'path',
            pathId: child.pathId,
            folderPath: normalizeAiPathFolderPath(parentId ? fromAiPathFolderNodeId(parentId) : ''),
          },
        });
      }
      if (child.children.length > 0) {
        walk(child.children, child.id);
      }
    });
  };

  walk(root.children, null);
  return nodes;
};

const createMasterNodeMap = (nodes: MasterTreeNode[]): Map<string, MasterTreeNode> =>
  new Map(nodes.map((node: MasterTreeNode): [string, MasterTreeNode] => [node.id, node]));

export const findAiPathMasterNodeAncestorIds = (nodes: MasterTreeNode[], nodeId: string): string[] => {
  const byId = createMasterNodeMap(nodes);
  const ancestors: string[] = [];

  let cursor = byId.get(nodeId)?.parentId ?? null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return ancestors;
};

export const resolveAiPathFolderTargetPathForNode = (
  nodes: MasterTreeNode[],
  nodeId: string | null
): string | null => {
  if (!nodeId) return '';

  const folderPath = fromAiPathFolderNodeId(nodeId);
  if (folderPath !== null) return folderPath;

  const byId = createMasterNodeMap(nodes);
  let cursor: string | null = byId.get(nodeId)?.parentId ?? null;

  while (cursor) {
    const candidateFolderPath = fromAiPathFolderNodeId(cursor);
    if (candidateFolderPath !== null) return candidateFolderPath;
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return '';
};
