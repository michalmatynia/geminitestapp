import type { AdminMenuCustomNode, AdminNavNodeEntry } from '@/shared/contracts/admin';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type {
  AdminMenuLayoutNodeEntry as AdminMenuLayoutFallbackEntry,
  AdminMenuLayoutNodeSemantic,
} from './admin-menu-layout-types';

export type { AdminMenuLayoutNodeSemantic };

export type AdminMenuLayoutNodeMetadata = {
  nodeId: string;
  isBuiltIn: boolean;
  semantic: AdminMenuLayoutNodeSemantic;
  href: string | null;
};

export type { AdminMenuLayoutFallbackEntry };

const DEFAULT_LABEL = 'Untitled';
const GROUP_NODE_SEMANTIC: AdminMenuLayoutNodeSemantic = 'group';
const LINK_NODE_SEMANTIC: AdminMenuLayoutNodeSemantic = 'link';

const slugifyPathSegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return normalized === '' ? 'item' : normalized;
};

const resolveLabel = (input: string | null | undefined): string => {
  const trimmed = (input ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_LABEL;
};

const resolveHref = (input: string | null | undefined): string | null => {
  const trimmed = (input ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSemantic = (href: string | null): AdminMenuLayoutNodeSemantic =>
  href !== null ? LINK_NODE_SEMANTIC : GROUP_NODE_SEMANTIC;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveNodeId = (value: string): string | null => {
  const nodeId = value.trim();
  return nodeId === '' ? null : nodeId;
};

const resolveNodeSemantic = (
  semantic: AdminMenuLayoutNodeSemantic | undefined,
  href: string | null
): AdminMenuLayoutNodeSemantic => semantic ?? resolveSemantic(href);

const resolveItemChildren = (children: AdminMenuCustomNode[] | undefined): AdminMenuCustomNode[] =>
  Array.isArray(children) ? children : [];

const resolveNodeBase = (
  libraryItemMap: Map<string, AdminNavNodeEntry>,
  nodeId: string
): AdminNavNodeEntry | undefined => libraryItemMap.get(nodeId);

const resolveNodeHref = (
  item: AdminMenuCustomNode,
  base: AdminNavNodeEntry | undefined
): string | null => resolveHref(item.href ?? base?.href ?? null);

const resolveMasterNodeName = (
  item: AdminMenuCustomNode,
  base: AdminNavNodeEntry | undefined,
  nodeId: string
): string => resolveLabel(item.label ?? base?.label ?? nodeId);

const resolveNodePath = (parentPath: string, pathSegment: string): string =>
  parentPath !== '' ? `${parentPath}/${pathSegment}` : pathSegment;

const resolveRebuiltSemantic = (
  fallback: AdminMenuLayoutFallbackEntry | undefined,
  metadata: AdminMenuLayoutNodeMetadata | null,
  href: string | null
): AdminMenuLayoutNodeSemantic =>
  resolveNodeSemantic(metadata?.semantic ?? fallback?.semantic, href);

const resolveRebuiltChildren = (
  build: (parentId: string | null) => AdminMenuCustomNode[],
  childrenByParent: Map<string | null, MasterTreeNode[]>,
  nodeId: string
): AdminMenuCustomNode[] => (childrenByParent.has(nodeId) ? build(nodeId) : []);

const readAdminMenuMetadataRecord = (
  node: Pick<MasterTreeNode, 'metadata'>
): Record<string, unknown> | null => {
  if (!isRecord(node.metadata)) return null;
  const adminMenu = node.metadata['adminMenu'];
  return isRecord(adminMenu) ? adminMenu : null;
};

const createAdminMenuMasterNode = ({
  href,
  isBuiltIn,
  name,
  nodeId,
  parentId,
  path,
  semantic,
  sortOrder,
}: {
  href: string | null;
  isBuiltIn: boolean;
  name: string;
  nodeId: string;
  parentId: string | null;
  path: string;
  semantic: AdminMenuLayoutNodeSemantic;
  sortOrder: number;
}): MasterTreeNode => ({
  id: nodeId,
  type: 'folder',
  kind: 'folder',
  parentId,
  name,
  path,
  sortOrder,
  metadata: {
    adminMenu: {
      nodeId,
      isBuiltIn,
      semantic,
      href,
    } satisfies AdminMenuLayoutNodeMetadata,
  },
});

const createRebuiltAdminMenuNode = ({
  children,
  href,
  label,
  nodeId,
  semantic,
}: {
  children: AdminMenuCustomNode[];
  href: string | null;
  label: string;
  nodeId: string;
  semantic: AdminMenuLayoutNodeSemantic;
}): AdminMenuCustomNode => ({
  id: nodeId,
  label,
  ...(semantic === LINK_NODE_SEMANTIC && href !== null ? { href } : {}),
  ...(children.length > 0 ? { children } : {}),
});

const createAdminMenuMasterNodeEntry = ({
  index,
  item,
  libraryItemMap,
  parentId,
  parentPath,
}: {
  index: number;
  item: AdminMenuCustomNode;
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  parentId: string | null;
  parentPath: string;
}): { children: AdminMenuCustomNode[]; node: MasterTreeNode; nodeId: string; path: string } | null => {
  const nodeId = resolveNodeId(item.id);
  if (nodeId === null) {
    return null;
  }

  const base = resolveNodeBase(libraryItemMap, nodeId);
  const children = resolveItemChildren(item.children);
  const href = resolveNodeHref(item, base);
  const name = resolveMasterNodeName(item, base, nodeId);
  const pathSegment = slugifyPathSegment(nodeId);
  const path = resolveNodePath(parentPath, pathSegment);

  return {
    children,
    node: createAdminMenuMasterNode({
      href,
      isBuiltIn: libraryItemMap.has(nodeId),
      name,
      nodeId,
      parentId,
      path,
      semantic: resolveSemantic(href),
      sortOrder: index,
    }),
    nodeId,
    path,
  };
};

const buildAdminMenuCustomNode = ({
  build,
  childrenByParent,
  fallbackById,
  node,
}: {
  build: (parentId: string | null) => AdminMenuCustomNode[];
  childrenByParent: Map<string | null, MasterTreeNode[]>;
  fallbackById: Map<string, AdminMenuLayoutFallbackEntry>;
  node: MasterTreeNode;
}): AdminMenuCustomNode => {
  const fallback = fallbackById.get(node.id);
  const metadata = readAdminMenuLayoutMetadata(node);
  const href = resolveHref(metadata?.href ?? fallback?.href ?? null);
  const semantic = resolveRebuiltSemantic(fallback, metadata, href);
  const children = resolveRebuiltChildren(build, childrenByParent, node.id);

  return createRebuiltAdminMenuNode({
    children,
    href,
    label: resolveLabel(node.name),
    nodeId: node.id,
    semantic,
  });
};

export const readAdminMenuLayoutMetadata = (
  node: Pick<MasterTreeNode, 'metadata'>
): AdminMenuLayoutNodeMetadata | null => {
  const adminMenu = readAdminMenuMetadataRecord(node);
  if (adminMenu === null) return null;

  const rawNodeId = adminMenu['nodeId'];
  if (typeof rawNodeId !== 'string' || rawNodeId.trim().length === 0) return null;

  const rawSemantic = adminMenu['semantic'];
  const semantic: AdminMenuLayoutNodeSemantic =
    rawSemantic === 'link' || rawSemantic === 'group' ? rawSemantic : 'group';

  const rawBuiltIn = adminMenu['isBuiltIn'];
  const rawHref = adminMenu['href'];

  return {
    nodeId: rawNodeId.trim(),
    isBuiltIn: Boolean(rawBuiltIn),
    semantic,
    href: typeof rawHref === 'string' && rawHref.trim().length > 0 ? rawHref.trim() : null,
  };
};

export const buildAdminMenuLayoutMasterNodes = (
  customNav: AdminMenuCustomNode[],
  libraryItemMap: Map<string, AdminNavNodeEntry>
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    items: AdminMenuCustomNode[],
    parentId: string | null,
    parentPath: string
  ): void => {
    items.forEach((item, index) => {
      const entry = createAdminMenuMasterNodeEntry({
        index,
        item,
        libraryItemMap,
        parentId,
        parentPath,
      });
      if (entry === null) {
        return;
      }

      nodes.push(entry.node);
      if (entry.children.length > 0) {
        walk(entry.children, entry.nodeId, entry.path);
      }
    });
  };

  walk(customNav, null, '');
  return nodes;
};

const sortNodes = (nodes: MasterTreeNode[]): MasterTreeNode[] =>
  [...nodes].sort((left, right) => {
    const parentLeft = left.parentId ?? '';
    const parentRight = right.parentId ?? '';
    if (parentLeft !== parentRight) {
      return parentLeft.localeCompare(parentRight);
    }

    const orderDelta = left.sortOrder - right.sortOrder;
    if (orderDelta !== 0) return orderDelta;

    return left.id.localeCompare(right.id);
  });

export const createAdminMenuLayoutFallbackMap = (
  nodes: MasterTreeNode[]
): Map<string, AdminMenuLayoutFallbackEntry> => {
  const fallbackById = new Map<string, AdminMenuLayoutFallbackEntry>();

  nodes.forEach((node) => {
    const metadata = readAdminMenuLayoutMetadata(node);
    const href = resolveHref(metadata?.href ?? null);
    const semantic = resolveNodeSemantic(metadata?.semantic, href);

    fallbackById.set(node.id, {
      id: node.id,
      label: resolveLabel(node.name),
      semantic,
      href,
      isBuiltIn: metadata?.isBuiltIn ?? false,
    });
  });

  return fallbackById;
};

export const rebuildAdminMenuCustomNavFromMasterNodes = (
  nextNodes: MasterTreeNode[],
  fallbackById: Map<string, AdminMenuLayoutFallbackEntry>
): AdminMenuCustomNode[] => {
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();

  sortNodes(nextNodes).forEach((node) => {
    const parentId = node.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  });

  const build = (parentId: string | null): AdminMenuCustomNode[] => {
    const siblings = childrenByParent.get(parentId) ?? [];

    return siblings.map((node) =>
      buildAdminMenuCustomNode({ build, childrenByParent, fallbackById, node })
    );
  };

  return build(null);
};
