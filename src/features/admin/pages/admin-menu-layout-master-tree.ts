import type { AdminMenuCustomNode, AdminNavNodeEntry } from '@/shared/contracts/admin';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type AdminMenuLayoutNodeSemantic = 'link' | 'group';

export type AdminMenuLayoutNodeMetadata = {
  nodeId: string;
  isBuiltIn: boolean;
  semantic: AdminMenuLayoutNodeSemantic;
  href: string | null;
};

export type AdminMenuLayoutFallbackEntry = {
  id: string;
  label: string;
  semantic: AdminMenuLayoutNodeSemantic;
  href: string | null;
  isBuiltIn: boolean;
};

const DEFAULT_LABEL = 'Untitled';

const slugifyPathSegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return normalized || 'item';
};

const resolveLabel = (input: string | null | undefined): string => {
  const trimmed = (input ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_LABEL;
};

const resolveHref = (input: string | null | undefined): string | null => {
  const trimmed = (input ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSemantic = ({
  href,
  children,
}: {
  href: string | null;
  children: AdminMenuCustomNode[] | null | undefined;
}): AdminMenuLayoutNodeSemantic => {
  if (href) return 'link';
  if (Array.isArray(children)) return 'group';
  return 'group';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const readAdminMenuLayoutMetadata = (
  node: Pick<MasterTreeNode, 'metadata'>
): AdminMenuLayoutNodeMetadata | null => {
  if (!isRecord(node.metadata)) return null;
  const adminMenu = node.metadata['adminMenu'];
  if (!isRecord(adminMenu)) return null;

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
      const nodeId = item.id.trim();
      if (!nodeId) return;

      const base = libraryItemMap.get(nodeId);
      const children = Array.isArray(item.children) ? item.children : [];
      const href = resolveHref(item.href ?? base?.href ?? null);
      const semantic = resolveSemantic({ href, children: item.children });
      const name = resolveLabel(item.label ?? base?.label ?? nodeId);
      const pathSegment = slugifyPathSegment(nodeId);
      const path = parentPath ? `${parentPath}/${pathSegment}` : pathSegment;

      nodes.push({
        id: nodeId,
        type: 'folder',
        kind: 'folder',
        parentId,
        name,
        path,
        sortOrder: index,
        metadata: {
          adminMenu: {
            nodeId,
            isBuiltIn: libraryItemMap.has(nodeId),
            semantic,
            href,
          } satisfies AdminMenuLayoutNodeMetadata,
        },
      });

      if (children.length > 0) {
        walk(children, nodeId, path);
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
    const semantic = metadata?.semantic ?? (href ? 'link' : 'group');

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

    return siblings.map((node) => {
      const fallback = fallbackById.get(node.id);
      const metadata = readAdminMenuLayoutMetadata(node);
      const href = resolveHref(metadata?.href ?? fallback?.href ?? null);
      const semantic = metadata?.semantic ?? fallback?.semantic ?? (href ? 'link' : 'group');
      const label = resolveLabel(node.name || fallback?.label || node.id);
      const children = build(node.id);

      const rebuilt: AdminMenuCustomNode = {
        id: node.id,
        label,
      };

      if (semantic === 'link' && href) {
        rebuilt.href = href;
      }

      if (children.length > 0) {
        rebuilt.children = children;
      }

      return rebuilt;
    });
  };

  return build(null);
};
