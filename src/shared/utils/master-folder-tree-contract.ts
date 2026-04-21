import type {
  MasterTreeNodeTypeDto,
  MasterTreeTargetTypeDto,
  MasterTreeDropPositionDto,
  MasterTreeNode,
  MasterTreeId,
} from '../contracts/master-folder-tree';

export const masterTreeNodeTypeValues = ['folder', 'file'] as const;
export type MasterTreeNodeType = MasterTreeNodeTypeDto;

export const masterTreeTargetTypeValues = ['folder', 'root'] as const;
export type MasterTreeTargetType = MasterTreeTargetTypeDto;

export const masterTreeDropPositionValues = ['inside', 'before', 'after'] as const;
export type MasterTreeDropPosition = MasterTreeDropPositionDto;

export type MasterTreeKind = string;
export type MasterTreePath = string;

export type { MasterTreeNode, MasterTreeId };

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
  if (normalized === '') return '';
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? '';
};

export const resolveMasterTreePathSegment = (
  node: Pick<MasterTreeNode, 'id' | 'name' | 'path'>
): string => {
  const pathLeaf = normalizePathSegment(getPathLeaf(node.path));
  if (pathLeaf !== '') return pathLeaf;
  const nameLeaf = normalizePathSegment(node.name);
  if (nameLeaf !== '') return nameLeaf;
  const normalizedId = normalizePathSegment(node.id);
  return normalizedId !== '' ? normalizedId : node.id;
};

export const normalizeMasterTreeKind = (
  value: string | null | undefined,
  fallback: string
): MasterTreeKind => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized !== '' ? normalized : fallback;
};

export const compareMasterTreeNodes = (a: MasterTreeNode, b: MasterTreeNode): number => {
  const orderDelta = a.sortOrder - b.sortOrder;
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = a.name.localeCompare(b.name);
  if (nameDelta !== 0) return nameDelta;
  return a.id.localeCompare(b.id);
};
