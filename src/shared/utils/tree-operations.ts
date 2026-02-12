export type TreeNodeRecord<T extends TreeNodeRecord<T>> = {
  id: string;
  children: T[];
};

export const normalizeTreePath = (value: string): string =>
  value
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

export const getTreePathLeaf = (value: string): string => {
  const normalized = normalizeTreePath(value);
  if (!normalized) return '';
  return normalized.split('/').pop() ?? '';
};

export const isTreePathWithin = (value: string, parentPath: string): boolean => {
  const normalizedValue = normalizeTreePath(value);
  const normalizedParent = normalizeTreePath(parentPath);
  if (!normalizedParent) return false;
  return (
    normalizedValue === normalizedParent ||
    normalizedValue.startsWith(`${normalizedParent}/`)
  );
};

export const canMoveTreePath = (sourcePath: string, targetPath: string): boolean => {
  const source = normalizeTreePath(sourcePath);
  const target = normalizeTreePath(targetPath);
  if (!source) return false;
  if (source === target) return false;
  if (target.startsWith(`${source}/`)) return false;
  return true;
};

export const rebaseTreePath = (
  value: string,
  sourcePath: string,
  targetPath: string,
): string => {
  const source = normalizeTreePath(sourcePath);
  const target = normalizeTreePath(targetPath);
  const normalizedValue = normalizeTreePath(value);
  if (!source || !normalizedValue) return normalizedValue;
  if (normalizedValue === source) return target;
  if (normalizedValue.startsWith(`${source}/`)) {
    const suffix = normalizedValue.slice(source.length);
    return `${target}${suffix}`;
  }
  return normalizedValue;
};

export const collectTreeNodeIds = <T extends TreeNodeRecord<T>>(
  nodes: T[],
): string[] => {
  const ids: string[] = [];
  const walk = (items: T[]): void => {
    items.forEach((item: T) => {
      ids.push(item.id);
      if (item.children.length > 0) walk(item.children);
    });
  };
  walk(nodes);
  return ids;
};

export const findTreeNodeById = <T extends TreeNodeRecord<T>>(
  nodes: T[],
  id: string,
): T | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findTreeNodeById(node.children, id);
    if (found) return found;
  }
  return null;
};

export const findTreeNodeParentId = <T extends TreeNodeRecord<T>>(
  nodes: T[],
  id: string,
  parentId: string | null = null,
): string | null => {
  for (const node of nodes) {
    if (node.id === id) return parentId;
    const found = findTreeNodeParentId(node.children, id, node.id);
    if (found !== null) return found;
  }
  return null;
};

const isNodeIdInSubtree = <T extends TreeNodeRecord<T>>(
  node: T,
  targetId: string,
): boolean => {
  if (node.id === targetId) return true;
  return node.children.some((child: T) => isNodeIdInSubtree(child, targetId));
};

export const isTreeNodeIdInSubtree = <T extends TreeNodeRecord<T>>(
  nodes: T[],
  rootNodeId: string,
  targetId: string,
): boolean => {
  const root = findTreeNodeById(nodes, rootNodeId);
  if (!root) return false;
  return isNodeIdInSubtree(root, targetId);
};
