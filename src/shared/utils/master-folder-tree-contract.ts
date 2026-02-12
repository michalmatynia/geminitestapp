export const masterTreeNodeTypeValues = ['folder', 'file'] as const;
export type MasterTreeNodeType = (typeof masterTreeNodeTypeValues)[number];

export const masterTreeTargetTypeValues = ['folder', 'root'] as const;
export type MasterTreeTargetType = (typeof masterTreeTargetTypeValues)[number];

export const masterTreeDropPositionValues = ['inside', 'before', 'after'] as const;
export type MasterTreeDropPosition = (typeof masterTreeDropPositionValues)[number];

export type MasterTreeId = string;
export type MasterTreeKind = string;
export type MasterTreePath = string;

export type MasterTreeNode = {
  id: MasterTreeId;
  type: MasterTreeNodeType;
  kind: MasterTreeKind;
  parentId: MasterTreeId | null;
  name: string;
  path: MasterTreePath;
  sortOrder: number;
  icon?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export const isMasterTreeNodeType = (value: unknown): value is MasterTreeNodeType =>
  typeof value === 'string' && (masterTreeNodeTypeValues as readonly string[]).includes(value);

export const normalizeMasterTreePath = (value: string): MasterTreePath =>
  value
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

const normalizePathSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const getPathLeaf = (path: string): string => {
  const normalized = normalizeMasterTreePath(path);
  if (!normalized) return '';
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? '';
};

export const resolveMasterTreePathSegment = (
  node: Pick<MasterTreeNode, 'id' | 'name' | 'path'>
): string => {
  const pathLeaf = normalizePathSegment(getPathLeaf(node.path));
  if (pathLeaf) return pathLeaf;
  const nameLeaf = normalizePathSegment(node.name);
  if (nameLeaf) return nameLeaf;
  return normalizePathSegment(node.id) || node.id;
};

export const normalizeMasterTreeKind = (
  value: string | null | undefined,
  fallback: string
): MasterTreeKind => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized || fallback;
};

export const compareMasterTreeNodes = (a: MasterTreeNode, b: MasterTreeNode): number => {
  const orderDelta = a.sortOrder - b.sortOrder;
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = a.name.localeCompare(b.name);
  if (nameDelta !== 0) return nameDelta;
  return a.id.localeCompare(b.id);
};
