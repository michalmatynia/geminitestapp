import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { AdminMenuCustomNode } from '@/shared/contracts/admin';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  type FlattenedNavItem,
  type NavItem,
  applySectionColors,
  buildAdminMenuFromCustomNav,
  collectActiveGroupIds,
  collectGroupIds,
  filterTree,
  flattenAdminNav,
  isActiveHref,
  normalizeText,
  scheduleDeferredAdminMenuSettingsHydration,
} from '../components/menu/admin-menu-utils';
import { OPEN_KEY, POPULAR_ADMIN_PREFETCH_HREFS } from '../components/menu/admin-menu-constants';

type StoredOpenIdsState = {
  openIdsLoaded: boolean;
  setUserOpenIds: Dispatch<SetStateAction<Set<string>>>;
  userOpenIds: Set<string>;
};

type AdminMenuFilteredNavArgs = {
  baseNav: NavItem[];
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  favoriteIds: string[];
  pathname: string;
  query: string;
  sectionColors: Record<string, string>;
};

type AdminMenuFilteredNavState = {
  allGroupIds: Set<string>;
  autoOpenIds: Set<string>;
  filteredNav: NavItem[];
  normalizedQuery: string;
};

type AdminMenuOpenStateArgs = {
  allGroupIds: Set<string>;
  autoOpenIds: Set<string>;
  normalizedQuery: string;
  pathname: string;
  setUserOpenIds: Dispatch<SetStateAction<Set<string>>>;
  userOpenIds: Set<string>;
};

type AdminMenuOpenState = {
  effectiveOpenIds: Set<string>;
  handleToggleAllFolders: () => void;
  handleToggleOpen: (id: string) => void;
  isAnyFolderOpen: boolean;
};

const buildFavoriteItems = (favoriteIds: string[], baseNavWithColors: NavItem[]): NavItem[] => {
  if (favoriteIds.length === 0) {
    return [];
  }

  const byId = new Map(
    flattenAdminNav(baseNavWithColors).map((entry: FlattenedNavItem) => [entry.id, entry.item])
  );
  const seen = new Set<string>();
  return favoriteIds.reduce((items: NavItem[], id: string) => {
    if (seen.has(id)) {
      return items;
    }
    const item = byId.get(id);
    if (item === undefined) {
      return items;
    }

    const itemWithoutChildren = { ...item };
    delete itemWithoutChildren.children;
    seen.add(id);
    items.push(itemWithoutChildren);
    return items;
  }, []);
};

const buildNavWithFavorites = (favoriteItems: NavItem[], navWithColors: NavItem[]): NavItem[] =>
  favoriteItems.length === 0
    ? navWithColors
    : [
        {
          id: 'favorites',
          label: 'Favorites',
          children: favoriteItems,
        },
        ...navWithColors,
      ];

const mergeEffectiveOpenIds = (
  autoOpenIds: Set<string>,
  closedAutoIds: Set<string>,
  normalizedQuery: string,
  userOpenIds: Set<string>
): Set<string> => {
  const open = new Set<string>(userOpenIds);
  autoOpenIds.forEach((id: string) => {
    if (normalizedQuery !== '' || !closedAutoIds.has(id)) {
      open.add(id);
    }
  });
  return open;
};

const addSetValue = (
  setValue: Dispatch<SetStateAction<Set<string>>>,
  id: string
): void => {
  setValue((previous: Set<string>) => {
    if (previous.has(id)) {
      return previous;
    }
    const next = new Set(previous);
    next.add(id);
    return next;
  });
};

const deleteSetValue = (
  setValue: Dispatch<SetStateAction<Set<string>>>,
  id: string
): void => {
  setValue((previous: Set<string>) => {
    if (!previous.has(id)) {
      return previous;
    }
    const next = new Set(previous);
    next.delete(id);
    return next;
  });
};

export function useStoredAdminMenuOpenIds(): StoredOpenIdsState {
  const [userOpenIds, setUserOpenIds] = useState<Set<string>>(new Set());
  const [openIdsLoaded, setOpenIdsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (raw === null || raw === '') return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setUserOpenIds(
          new Set(parsed.filter((id: unknown): id is string => typeof id === 'string'))
        );
      }
    } catch (error) {
      logClientError(error);
    } finally {
      setOpenIdsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!openIdsLoaded || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(userOpenIds)));
    } catch (error) {
      logClientError(error);
    }
  }, [openIdsLoaded, userOpenIds]);

  return { openIdsLoaded, setUserOpenIds, userOpenIds };
}

export function useAdminMenuSettingsReady(): boolean {
  const [menuSettingsReady, setMenuSettingsReady] = useState(false);

  useEffect(() => {
    if (menuSettingsReady === true) return undefined;
    if (typeof window === 'undefined') {
      setMenuSettingsReady(true);
      return undefined;
    }
    return scheduleDeferredAdminMenuSettingsHydration(window, () => setMenuSettingsReady(true));
  }, [menuSettingsReady]);

  return menuSettingsReady;
}

export function useResetPendingAdminHref(
  pathname: string,
  pendingHref: string | null,
  setPendingHref: Dispatch<SetStateAction<string | null>>
): void {
  useEffect(() => {
    if (pendingHref === null || pendingHref === '') return;
    if (isActiveHref(pathname, pendingHref, false)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref, setPendingHref]);
}

export function usePrefetchPopularAdminRoutes(
  pathname: string,
  prefetchRoute: (href: string) => void
): void {
  const hasPrefetchedPopularRoutesRef = useRef(false);

  useEffect(() => {
    if (hasPrefetchedPopularRoutesRef.current === true || typeof window === 'undefined') return;
    hasPrefetchedPopularRoutesRef.current = true;
    return scheduleDeferredAdminMenuSettingsHydration(window, () => {
      POPULAR_ADMIN_PREFETCH_HREFS.forEach((href: string) => {
        if (!isActiveHref(pathname, href, false)) {
          prefetchRoute(href);
        }
      });
    });
  }, [pathname, prefetchRoute]);
}

export function useAdminMenuFilteredNav({
  baseNav,
  customEnabled,
  customNav,
  favoriteIds,
  pathname,
  query,
  sectionColors,
}: AdminMenuFilteredNavArgs): AdminMenuFilteredNavState {
  const nav = useMemo(
    () => (customEnabled === true ? buildAdminMenuFromCustomNav(customNav, baseNav) : baseNav),
    [baseNav, customEnabled, customNav]
  );
  const navWithColors = useMemo(() => applySectionColors(nav, sectionColors), [nav, sectionColors]);
  const baseNavWithColors = useMemo(
    () => applySectionColors(baseNav, sectionColors),
    [baseNav, sectionColors]
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteItems = useMemo(
    () => buildFavoriteItems(favoriteIds, baseNavWithColors),
    [baseNavWithColors, favoriteIds]
  );
  const navWithFavorites = useMemo(
    () => buildNavWithFavorites(favoriteItems, navWithColors),
    [favoriteItems, navWithColors]
  );
  const normalizedQuery = useMemo(() => normalizeText(query), [query]);
  const filteredNav = useMemo(
    () => filterTree(navWithFavorites, normalizedQuery),
    [navWithFavorites, normalizedQuery]
  );
  const autoOpenIds = useMemo(
    () =>
      normalizedQuery !== ''
        ? collectGroupIds(filteredNav)
        : collectActiveGroupIds(navWithFavorites, pathname, favoriteIdSet),
    [favoriteIdSet, filteredNav, navWithFavorites, normalizedQuery, pathname]
  );
  const allGroupIds = useMemo(() => collectGroupIds(navWithFavorites), [navWithFavorites]);

  return { allGroupIds, autoOpenIds, filteredNav, normalizedQuery };
}

export function useAdminMenuOpenState({
  allGroupIds,
  autoOpenIds,
  normalizedQuery,
  pathname,
  setUserOpenIds,
  userOpenIds,
}: AdminMenuOpenStateArgs): AdminMenuOpenState {
  const [closedAutoIds, setClosedAutoIds] = useState<Set<string>>(new Set());
  const lastPathnameForClosedRef = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPathnameForClosedRef.current || normalizedQuery !== '') return;
    lastPathnameForClosedRef.current = pathname;
    setClosedAutoIds((previous: Set<string>) =>
      new Set<string>(Array.from(previous).filter((id: string) => autoOpenIds.has(id)))
    );
  }, [autoOpenIds, normalizedQuery, pathname]);

  const effectiveOpenIds = useMemo(
    () => mergeEffectiveOpenIds(autoOpenIds, closedAutoIds, normalizedQuery, userOpenIds),
    [autoOpenIds, closedAutoIds, normalizedQuery, userOpenIds]
  );
  const isAnyFolderOpen = effectiveOpenIds.size > 0;

  const handleToggleOpen = useCallback((id: string): void => {
    if (normalizedQuery !== '') return;
    if (effectiveOpenIds.has(id)) {
      deleteSetValue(setUserOpenIds, id);
      if (autoOpenIds.has(id)) addSetValue(setClosedAutoIds, id);
      return;
    }
    deleteSetValue(setClosedAutoIds, id);
    addSetValue(setUserOpenIds, id);
  }, [autoOpenIds, effectiveOpenIds, normalizedQuery, setUserOpenIds]);

  const handleToggleAllFolders = useCallback((): void => {
    if (normalizedQuery !== '') return;
    if (isAnyFolderOpen === true) {
      setUserOpenIds(new Set<string>());
      setClosedAutoIds(new Set<string>(autoOpenIds));
      return;
    }
    setClosedAutoIds(new Set<string>());
    setUserOpenIds(new Set<string>(allGroupIds));
  }, [allGroupIds, autoOpenIds, isAnyFolderOpen, normalizedQuery, setUserOpenIds]);

  return { effectiveOpenIds, handleToggleAllFolders, handleToggleOpen, isAnyFolderOpen };
}
