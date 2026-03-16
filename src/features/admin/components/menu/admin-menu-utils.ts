import type { AdminNavItem, AdminMenuCustomNode, AdminNavLeaf } from '@/shared/contracts/admin';

export type NavItem = Omit<AdminNavItem, 'children'> & {
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  action?: () => void;
  required?: boolean;
  children?: NavItem[];
  sectionColor?: string;
};

export type FlattenedNavItem = AdminNavLeaf;

export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const stripQuery = (href: string): string => href.split('?')[0] ?? href;

export const isActiveHref = (pathname: string, href: string, exact?: boolean): boolean => {
  const baseHref = stripQuery(href);
  if (!baseHref) return false;
  if (exact) return pathname === baseHref;
  if (pathname === baseHref) return true;
  if (baseHref === '/admin') return pathname === '/admin';
  return pathname.startsWith(`${baseHref}/`);
};

export const matchesQuery = (item: NavItem, query: string): boolean => {
  if (!query) return true;
  const haystack = normalizeText(
    [item.label, item.href ? stripQuery(item.href) : '', ...(item.keywords ?? [])].join(' ')
  );
  return haystack.includes(normalizeText(query));
};

export const filterTree = (items: NavItem[], query: string): NavItem[] => {
  if (!query) return items;
  const next: NavItem[] = [];
  items.forEach((item: NavItem) => {
    const children = item.children ? filterTree(item.children, query) : [];
    if (matchesQuery(item, query) || children.length > 0) {
      next.push({ ...item, ...(children.length ? { children } : {}) });
    }
  });
  return next;
};

export const collectGroupIds = (items: NavItem[]): Set<string> => {
  const ids = new Set<string>();
  const walk = (node: NavItem): void => {
    if (node.children && node.children.length > 0) {
      ids.add(node.id);
      node.children.forEach(walk);
    }
  };
  items.forEach(walk);
  return ids;
};

export const collectActiveGroupIds = (
  items: NavItem[],
  pathname: string,
  favoriteIds: Set<string>
): Set<string> => {
  const active = new Set<string>();
  const walk = (node: NavItem): { any: boolean; nonFavorite: boolean } => {
    const selfActiveRaw = node.href ? isActiveHref(pathname, node.href, node.exact) : false;
    const selfActive =
      selfActiveRaw &&
      !(
        (node.children?.length ?? 0) > 0 &&
        node.href &&
        stripQuery(node.href) === '/admin' &&
        pathname === '/admin'
      );
    const childResults: Array<{ any: boolean; nonFavorite: boolean }> = (node.children ?? []).map(
      walk
    );
    const childActive = childResults.some((result) => result.any);
    const childNonFavorite = childResults.some((result) => result.nonFavorite);
    const isFavoriteLeaf = !node.children?.length && favoriteIds.has(node.id);
    const nonFavoriteActive = (selfActive && !isFavoriteLeaf) || childNonFavorite;
    if ((selfActive || childActive) && node.children && node.children.length > 0) {
      const shouldOpen = node.id === 'favorites' ? false : nonFavoriteActive;
      if (shouldOpen) {
        active.add(node.id);
      }
    }
    return { any: selfActive || childActive, nonFavorite: nonFavoriteActive };
  };
  items.forEach((item: NavItem) => walk(item));
  return active;
};

export const flattenAdminNav = (items: NavItem[], parents: string[] = []): FlattenedNavItem[] => {
  const entries: FlattenedNavItem[] = [];
  items.forEach((item: NavItem) => {
    const nextParents = [...parents, item.label];
    if (item.href && (!item.children || item.children.length === 0)) {
      entries.push({
        id: item.id,
        label: item.label,
        href: item.href,
        ...(item.keywords ? { keywords: item.keywords } : {}),
        parents: parents,
        item,
      });
    }
    if (item.children && item.children.length > 0) {
      entries.push(...flattenAdminNav(item.children, nextParents));
    }
  });
  return entries;
};

export const normalizeAdminMenuCustomNav = (value: unknown): AdminMenuCustomNode[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const walk = (nodes: unknown[]): AdminMenuCustomNode[] => {
    const result: AdminMenuCustomNode[] = [];
    nodes.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return;
      const rawId = (entry as { id?: unknown }).id;
      if (typeof rawId !== 'string' || rawId.trim().length === 0) return;
      const id = rawId.trim();
      if (seen.has(id)) return;
      seen.add(id);
      const node: AdminMenuCustomNode = { id };
      const rawLabel = (entry as { label?: unknown }).label;
      if (typeof rawLabel === 'string' && rawLabel.trim().length > 0) {
        node.label = rawLabel;
      }
      const rawHref = (entry as { href?: unknown }).href;
      if (typeof rawHref === 'string' && rawHref.trim().length > 0) {
        node.href = rawHref;
      }
      const rawChildren = (entry as { children?: unknown }).children;
      if (Array.isArray(rawChildren)) {
        const children = walk(rawChildren);
        node.children = children;
      }
      result.push(node);
    });
    return result;
  };
  return walk(value);
};

export const indexAdminNav = (
  items: NavItem[],
  map: Map<string, NavItem> = new Map<string, NavItem>()
): Map<string, NavItem> => {
  items.forEach((item: NavItem) => {
    map.set(item.id, item);
    if (item.children && item.children.length > 0) {
      indexAdminNav(item.children, map);
    }
  });
  return map;
};

export const mapCustomNavToAdminNav = (
  items: AdminMenuCustomNode[],
  baseMap: Map<string, NavItem>
): NavItem[] => {
  const result: NavItem[] = [];
  items.forEach((node: AdminMenuCustomNode) => {
    const base = baseMap.get(node.id);
    const label = node.label ?? base?.label ?? 'Untitled';
    if (!label) return;
    const href = node.href ?? base?.href;
    const children = Array.isArray(node.children)
      ? mapCustomNavToAdminNav(node.children, baseMap)
      : base?.children;
    const next: NavItem = {
      id: node.id,
      label,
      ...(href ? { href } : {}),
      ...(base?.exact ? { exact: base.exact } : {}),
      ...(base?.icon ? { icon: base.icon } : {}),
      ...(base?.keywords ? { keywords: base.keywords } : {}),
      ...(base?.onClick ? { onClick: base.onClick } : {}),
      ...(base?.action ? { action: base.action } : {}),
      ...(children && children.length > 0 ? { children } : {}),
    };
    result.push(next);
  });
  return result;
};

type RequiredNavEntry = {
  item: NavItem;
  parentIds: string[];
  baseSiblings: NavItem[];
};

const collectRequiredNavEntries = (
  items: NavItem[],
  parentIds: string[] = []
): RequiredNavEntry[] => {
  const entries: RequiredNavEntry[] = [];
  items.forEach((item: NavItem) => {
    if (item.required) {
      entries.push({ item, parentIds, baseSiblings: items });
    }
    if (item.children && item.children.length > 0) {
      entries.push(...collectRequiredNavEntries(item.children, [...parentIds, item.id]));
    }
  });
  return entries;
};

const hasNavItem = (items: NavItem[], id: string): boolean => {
  for (const item of items) {
    if (item.id === id) return true;
    if (item.children && item.children.length > 0) {
      if (hasNavItem(item.children, id)) return true;
    }
  }
  return false;
};

const insertByBaseOrder = (
  children: NavItem[],
  baseSiblings: NavItem[],
  item: NavItem
): NavItem[] => {
  if (children.some((child: NavItem) => child.id === item.id)) return children;
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
  let updated = false;
  const nextItems = items.map((node: NavItem) => {
    if (node.id !== parentId) return node;
    const children = node.children ?? [];
    const nextChildren = insertNavItemByParentPath(children, rest, item, baseSiblings);
    if (nextChildren === children) return node;
    updated = true;
    return {
      ...node,
      children: nextChildren,
    };
  });
  return updated ? nextItems : items;
};

const ensureRequiredAdminMenuItems = (nav: NavItem[], baseNav: NavItem[]): NavItem[] => {
  const requiredEntries = collectRequiredNavEntries(baseNav);
  if (requiredEntries.length === 0) return nav;

  return requiredEntries.reduce((current: NavItem[], entry: RequiredNavEntry) => {
    if (hasNavItem(current, entry.item.id)) return current;
    return insertNavItemByParentPath(current, entry.parentIds, entry.item, entry.baseSiblings);
  }, nav);
};

export const buildAdminMenuFromCustomNav = (
  customNav: AdminMenuCustomNode[],
  baseNav: NavItem[]
): NavItem[] => {
  if (!customNav || customNav.length === 0) return baseNav;
  const baseMap = indexAdminNav(baseNav);
  const mapped = mapCustomNavToAdminNav(customNav, baseMap);
  const merged = mapped.length > 0 ? mapped : baseNav;
  return ensureRequiredAdminMenuItems(merged, baseNav);
};

export const applySectionColors = (
  items: NavItem[],
  sectionColors: Record<string, string>,
  parentColor?: string
): NavItem[] =>
  items.map((item: NavItem): NavItem => {
    const resolvedColor = parentColor ?? sectionColors[item.id];
    const children = item.children
      ? applySectionColors(item.children, sectionColors, resolvedColor)
      : undefined;
    return {
      ...item,
      ...(resolvedColor ? { sectionColor: resolvedColor } : {}),
      ...(children ? { children } : {}),
    };
  });

export const adminNavToCustomNav = (items: NavItem[]): AdminMenuCustomNode[] => {
  return items.map((item: NavItem): AdminMenuCustomNode => {
    const node: AdminMenuCustomNode = { id: item.id };
    if (item.label) node.label = item.label;
    if (item.href) node.href = item.href;
    if (item.children && item.children.length > 0) {
      node.children = adminNavToCustomNav(item.children);
    }
    return node;
  });
};

export const getAdminMenuSections = (items: NavItem[]): NavItem[] => {
  return items.filter((item) => item.children && item.children.length > 0);
};
