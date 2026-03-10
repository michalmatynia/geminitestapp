import type { NavItem } from '@/features/admin/components/Menu';
import type {
  AdminMenuCustomNode,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';


const createCustomId = (): string =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createCustomNode = (kind: 'link' | 'group'): AdminMenuCustomNode => ({
  id: createCustomId(),
  label: kind === 'group' ? 'New Group' : 'New Link',
  ...(kind === 'link' ? { href: '/admin' } : {}),
  ...(kind === 'group' ? { children: [] } : {}),
});

export const cloneCustomNav = (items: AdminMenuCustomNode[]): AdminMenuCustomNode[] => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(items);
  }
  return JSON.parse(JSON.stringify(items)) as AdminMenuCustomNode[];
};

export const flattenAdminNavNodes = (
  items: NavItem[],
  parents: string[] = []
): AdminNavNodeEntry[] => {
  const entries: AdminNavNodeEntry[] = [];
  items.forEach((item: NavItem) => {
    entries.push({
      id: item.id,
      label: item.label,
      parents,
      item,
      ...(item.href ? { href: item.href } : {}),
    });
    const children = item.children;
    if (children && children.length > 0) {
      entries.push(...flattenAdminNavNodes(children, [...parents, item.label]));
    }
  });
  return entries;
};

export const collectCustomIds = (
  items: AdminMenuCustomNode[],
  ids: Set<string> = new Set<string>()
): Set<string> => {
  items.forEach((node: AdminMenuCustomNode) => {
    ids.add(node.id);
    const children = node.children;
    if (children && children.length > 0) {
      collectCustomIds(children, ids);
    }
  });
  return ids;
};

export const stripUsedIds = (
  node: AdminMenuCustomNode,
  usedIds: Set<string>
): AdminMenuCustomNode | null => {
  if (usedIds.has(node.id)) return null;
  usedIds.add(node.id);
  const nodeChildren = node.children;
  const children = nodeChildren
    ? nodeChildren
      .map((child: AdminMenuCustomNode) => stripUsedIds(child, usedIds))
      .filter((child: AdminMenuCustomNode | null): child is AdminMenuCustomNode => Boolean(child))
    : undefined;
  return {
    ...node,
    ...(children ? { children } : {}),
  };
};

export const normalizeAdminMenuSearch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const updateNodeById = (
  items: AdminMenuCustomNode[],
  nodeId: string,
  updater: (node: AdminMenuCustomNode) => AdminMenuCustomNode
): { next: AdminMenuCustomNode[]; updated: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; updated: boolean } => {
    let updated = false;
    const nextNodes = nodes.map((node: AdminMenuCustomNode) => {
      if (node.id === nodeId) {
        updated = true;
        return updater(node);
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.updated) {
          updated = true;
          return {
            ...node,
            children: childResult.next,
          };
        }
      }
      return node;
    });

    return { next: updated ? nextNodes : nodes, updated };
  };

  return walk(items);
};

export const insertChildNodeById = (
  items: AdminMenuCustomNode[],
  parentId: string,
  nodeToInsert: AdminMenuCustomNode
): { next: AdminMenuCustomNode[]; inserted: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; inserted: boolean } => {
    let inserted = false;
    const nextNodes = nodes.map((node: AdminMenuCustomNode) => {
      if (node.id === parentId) {
        inserted = true;
        return {
          ...node,
          children: [...(node.children ?? []), nodeToInsert],
        };
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.inserted) {
          inserted = true;
          return {
            ...node,
            children: childResult.next,
          };
        }
      }

      return node;
    });

    return { next: inserted ? nextNodes : nodes, inserted };
  };

  return walk(items);
};

export const removeNodeById = (
  items: AdminMenuCustomNode[],
  nodeId: string
): { next: AdminMenuCustomNode[]; removed: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; removed: boolean } => {
    let removed = false;
    const nextNodes: AdminMenuCustomNode[] = [];

    nodes.forEach((node: AdminMenuCustomNode) => {
      if (node.id === nodeId) {
        removed = true;
        return;
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.removed) {
          removed = true;
          nextNodes.push({
            ...node,
            ...(childResult.next.length > 0 ? { children: childResult.next } : {}),
          });
          return;
        }
      }

      nextNodes.push(node);
    });

    return { next: removed ? nextNodes : nodes, removed };
  };

  return walk(items);
};

export const findNodeById = (
  items: AdminMenuCustomNode[],
  nodeId: string
): AdminMenuCustomNode | null => {
  for (const node of items) {
    if (node.id === nodeId) return node;
    if (Array.isArray(node.children) && node.children.length > 0) {
      const nested = findNodeById(node.children, nodeId);
      if (nested) return nested;
    }
  }
  return null;
};
