import type { AdminMenuCustomNode } from '@/shared/contracts/admin';

import type { FlattenedNavItem, NavItem } from './admin-menu-utils';

type ActiveGroupResult = { any: boolean; nonFavorite: boolean };

const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

const getNavChildren = (item: Pick<NavItem, 'children'>): NavItem[] => item.children ?? [];
const hasNavChildren = (item: Pick<NavItem, 'children'>): boolean => getNavChildren(item).length > 0;

const isAdminOverviewNode = (node: NavItem, pathname: string, selfActive: boolean): boolean =>
  selfActive && hasNavChildren(node) && node.href === '/admin' && pathname === '/admin';

const createActiveGroupResult = (
  any: boolean,
  nonFavorite: boolean
): ActiveGroupResult => ({ any, nonFavorite });

const getNodeSelfActive = (node: NavItem, pathname: string): boolean =>
  hasText(node.href) && isActiveHref(pathname, node.href, node.exact);

const shouldOpenActiveGroup = ({
  childActive,
  hasChildren,
  nodeId,
  nonFavoriteActive,
  selfActive,
}: {
  childActive: boolean;
  hasChildren: boolean;
  nodeId: string;
  nonFavoriteActive: boolean;
  selfActive: boolean;
}): boolean => (selfActive || childActive) && hasChildren && nodeId !== 'favorites' && nonFavoriteActive;

const walkActiveGroups = (
  node: NavItem,
  pathname: string,
  favoriteIds: Set<string>,
  active: Set<string>
): ActiveGroupResult => {
  const hasChildren = hasNavChildren(node);
  const selfActive = getNodeSelfActive(node, pathname);
  const eligibleSelfActive = selfActive && !isAdminOverviewNode(node, pathname, selfActive);
  const childResults = getNavChildren(node).map((child: NavItem) =>
    walkActiveGroups(child, pathname, favoriteIds, active)
  );
  const childActive = childResults.some((result: ActiveGroupResult) => result.any);
  const childNonFavorite = childResults.some((result: ActiveGroupResult) => result.nonFavorite);
  const favoriteLeaf = !hasChildren && favoriteIds.has(node.id);
  const nonFavoriteActive = (eligibleSelfActive && !favoriteLeaf) || childNonFavorite;
  if (
    shouldOpenActiveGroup({
      childActive,
      hasChildren,
      nodeId: node.id,
      nonFavoriteActive,
      selfActive: eligibleSelfActive,
    })
  ) {
    active.add(node.id);
  }
  return createActiveGroupResult(eligibleSelfActive || childActive, nonFavoriteActive);
};

export const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[_/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();

export const stripQuery = (href: string): string => href.split('?')[0] ?? href;

export const isActiveHref = (pathname: string, href: string, exact?: boolean): boolean => {
  const baseHref = stripQuery(href);
  if (baseHref === '') return false;
  if (exact === true) return pathname === baseHref;
  if (pathname === baseHref) return true;
  if (baseHref === '/admin') return pathname === '/admin';
  return pathname.startsWith(`${baseHref}/`);
};

export const matchesQuery = (item: NavItem, query: string): boolean => {
  if (query === '') return true;
  const href = hasText(item.href) ? stripQuery(item.href) : '';
  const haystack = normalizeText([item.label, href, ...(item.keywords ?? [])].join(' '));
  return haystack.includes(normalizeText(query));
};

export const filterTree = (items: NavItem[], query: string): NavItem[] => {
  if (query === '') return items;
  return items.reduce((next: NavItem[], item: NavItem) => {
    const children = hasNavChildren(item) ? filterTree(getNavChildren(item), query) : [];
    if (matchesQuery(item, query) || children.length > 0) {
      next.push({ ...item, ...(children.length > 0 ? { children } : {}) });
    }
    return next;
  }, []);
};

export const collectGroupIds = (items: NavItem[]): Set<string> => {
  const ids = new Set<string>();
  items.forEach((item: NavItem) => {
    if (hasNavChildren(item)) {
      ids.add(item.id);
      collectGroupIds(getNavChildren(item)).forEach((id: string) => ids.add(id));
    }
  });
  return ids;
};

export const collectActiveGroupIds = (
  items: NavItem[],
  pathname: string,
  favoriteIds: Set<string>
): Set<string> => {
  const active = new Set<string>();
  items.forEach((item: NavItem) => {
    walkActiveGroups(item, pathname, favoriteIds, active);
  });
  return active;
};

export const flattenAdminNav = (
  items: NavItem[],
  parents: string[] = []
): FlattenedNavItem[] =>
  items.flatMap((item: NavItem) => {
    const nextParents = [...parents, item.label];
    const leafEntries =
      hasText(item.href) && !hasNavChildren(item)
        ? [{
            id: item.id,
            label: item.label,
            href: item.href,
            ...(item.keywords !== undefined ? { keywords: item.keywords } : {}),
            parents,
            item,
          }]
        : [];
    const childEntries = hasNavChildren(item) ? flattenAdminNav(getNavChildren(item), nextParents) : [];
    return [...leafEntries, ...childEntries];
  });

export const applySectionColors = (
  items: NavItem[],
  sectionColors: Record<string, string>,
  parentColor?: string
): NavItem[] =>
  items.map((item: NavItem): NavItem => {
    const resolvedColor = parentColor ?? sectionColors[item.id];
    const children = hasNavChildren(item)
      ? applySectionColors(getNavChildren(item), sectionColors, resolvedColor)
      : undefined;
    return {
      ...item,
      ...(hasText(resolvedColor) ? { sectionColor: resolvedColor } : {}),
      ...(children !== undefined && children.length > 0 ? { children } : {}),
    };
  });

export const adminNavToCustomNav = (items: NavItem[]): AdminMenuCustomNode[] =>
  items.map((item: NavItem): AdminMenuCustomNode => ({
    id: item.id,
    label: item.label,
    ...(hasText(item.href) ? { href: item.href } : {}),
    ...(hasNavChildren(item) ? { children: adminNavToCustomNav(getNavChildren(item)) } : {}),
  }));

export const getAdminMenuSections = (items: NavItem[]): NavItem[] =>
  items.filter((item: NavItem) => hasNavChildren(item));
