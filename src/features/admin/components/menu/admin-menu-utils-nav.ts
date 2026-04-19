import type { AdminMenuCustomNode } from '@/shared/contracts/admin';

import type { NavItem } from './admin-menu-utils';

type RequiredNavEntry = {
  item: NavItem;
  parentIds: string[];
  baseSiblings: NavItem[];
};

const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNavChildren = (item: Pick<NavItem, 'children'>): NavItem[] => item.children ?? [];
const hasNavChildren = (item: Pick<NavItem, 'children'>): boolean => getNavChildren(item).length > 0;
const getCustomNodeChildren = (node: AdminMenuCustomNode): AdminMenuCustomNode[] =>
  Array.isArray(node.children) ? node.children : [];

const readRecordString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const readTrimmedRecordString = (record: Record<string, unknown>, key: string): string | null => {
  const value = readRecordString(record, key);
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const readRecordArray = (record: Record<string, unknown>, key: string): unknown[] | null => {
  const value = record[key];
  return Array.isArray(value) ? value : null;
};

const getMappedNavLabel = (node: AdminMenuCustomNode, base: NavItem | undefined): string =>
  node.label ?? base?.label ?? 'Untitled';

const getMappedNavHref = (node: AdminMenuCustomNode, base: NavItem | undefined): string | undefined =>
  hasText(node.href) ? node.href : base?.href;

const getMappedNavChildren = (
  node: AdminMenuCustomNode,
  base: NavItem | undefined,
  baseMap: Map<string, NavItem>
): NavItem[] | undefined => {
  const children = getCustomNodeChildren(node);
  return children.length > 0 ? mapCustomNavToAdminNav(children, baseMap) : base?.children;
};

const getMappedNavOptionalProps = (
  node: AdminMenuCustomNode,
  base: NavItem | undefined,
  baseMap: Map<string, NavItem>
): Partial<NavItem> => ({
  href: getMappedNavHref(node, base),
  exact: base?.exact,
  icon: base?.icon,
  keywords: base?.keywords,
  onClick: base?.onClick,
  action: base?.action,
  children: getMappedNavChildren(node, base, baseMap),
});

const createMappedNavItem = (
  node: AdminMenuCustomNode,
  baseMap: Map<string, NavItem>
): NavItem => {
  const base = baseMap.get(node.id);
  return {
    id: node.id,
    label: getMappedNavLabel(node, base),
    ...getMappedNavOptionalProps(node, base, baseMap),
  };
};

const normalizeCustomNavEntry = (
  entry: unknown,
  seen: Set<string>,
  walk: (nodes: unknown[]) => AdminMenuCustomNode[]
): AdminMenuCustomNode | null => {
  if (!isRecord(entry)) {
    return null;
  }
  const id = readTrimmedRecordString(entry, 'id');
  if (id === null || seen.has(id)) {
    return null;
  }

  seen.add(id);
  const node: AdminMenuCustomNode = { id };
  const label = readTrimmedRecordString(entry, 'label');
  if (label !== null) {
    node.label = label;
  }
  const href = readTrimmedRecordString(entry, 'href');
  if (href !== null) {
    node.href = href;
  }
  const children = readRecordArray(entry, 'children');
  if (children !== null) {
    node.children = walk(children);
  }
  return node;
};

const collectRequiredNavEntries = (
  items: NavItem[],
  parentIds: string[] = []
): RequiredNavEntry[] => {
  const entries: RequiredNavEntry[] = [];
  items.forEach((item: NavItem) => {
    if (item.required === true) {
      entries.push({ item, parentIds, baseSiblings: items });
    }
    if (hasNavChildren(item)) {
      entries.push(...collectRequiredNavEntries(getNavChildren(item), [...parentIds, item.id]));
    }
  });
  return entries;
};

const hasNavItem = (items: NavItem[], id: string): boolean => {
  for (const item of items) {
    if (item.id === id) {
      return true;
    }
    if (hasNavChildren(item) && hasNavItem(getNavChildren(item), id)) {
      return true;
    }
  }
  return false;
};

const insertByBaseOrder = (children: NavItem[], baseSiblings: NavItem[], item: NavItem): NavItem[] => {
  if (children.some((child: NavItem) => child.id === item.id)) {
    return children;
  }
  const baseIds = baseSiblings.map((sibling: NavItem) => sibling.id);
  const targetIndex = baseIds.indexOf(item.id);
  if (targetIndex === -1) {
    return [...children, item];
  }

  let insertAt = children.length;
  for (let index = targetIndex + 1; index < baseIds.length; index += 1) {
    const nextId = baseIds[index];
    const existingIndex = children.findIndex((child: NavItem) => child.id === nextId);
    if (existingIndex !== -1) {
      insertAt = existingIndex;
      break;
    }
  }

  return [...children.slice(0, insertAt), item, ...children.slice(insertAt)];
};

const insertNavItemByParentPath = (
  items: NavItem[],
  parentIds: string[],
  item: NavItem,
  baseSiblings: NavItem[]
): NavItem[] => {
  if (parentIds.length === 0) {
    return insertByBaseOrder(items, baseSiblings, item);
  }

  const [parentId, ...rest] = parentIds;
  const nextItems = items.map((node: NavItem) => {
    if (node.id !== parentId) {
      return node;
    }
    const children = getNavChildren(node);
    const nextChildren = insertNavItemByParentPath(children, rest, item, baseSiblings);
    return nextChildren === children ? node : { ...node, children: nextChildren };
  });

  return nextItems.some((node: NavItem, index: number) => node !== items[index]) ? nextItems : items;
};

const ensureRequiredAdminMenuItems = (nav: NavItem[], baseNav: NavItem[]): NavItem[] =>
  collectRequiredNavEntries(baseNav).reduce((current: NavItem[], entry: RequiredNavEntry) => {
    if (hasNavItem(current, entry.item.id)) {
      return current;
    }
    return insertNavItemByParentPath(current, entry.parentIds, entry.item, entry.baseSiblings);
  }, nav);

export const normalizeAdminMenuCustomNav = (value: unknown): AdminMenuCustomNode[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const walk = (nodes: unknown[]): AdminMenuCustomNode[] =>
    nodes.reduce((result: AdminMenuCustomNode[], entry: unknown) => {
      const node = normalizeCustomNavEntry(entry, seen, walk);
      if (node !== null) {
        result.push(node);
      }
      return result;
    }, []);

  return walk(value);
};

export const indexAdminNav = (
  items: NavItem[],
  map: Map<string, NavItem> = new Map<string, NavItem>()
): Map<string, NavItem> => {
  items.forEach((item: NavItem) => {
    map.set(item.id, item);
    if (hasNavChildren(item)) {
      indexAdminNav(getNavChildren(item), map);
    }
  });
  return map;
};

export const mapCustomNavToAdminNav = (
  items: AdminMenuCustomNode[],
  baseMap: Map<string, NavItem>
): NavItem[] => items.map((node: AdminMenuCustomNode) => createMappedNavItem(node, baseMap));

export const buildAdminMenuFromCustomNav = (
  customNav: AdminMenuCustomNode[],
  baseNav: NavItem[]
): NavItem[] => {
  if (customNav.length === 0) {
    return baseNav;
  }

  const mapped = mapCustomNavToAdminNav(customNav, indexAdminNav(baseNav));
  return ensureRequiredAdminMenuItems(mapped.length > 0 ? mapped : baseNav, baseNav);
};
