import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { usePathname } from 'next/navigation';
import { useAdminLayoutActions, useAdminLayoutState } from '@/features/admin/context/AdminLayoutContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  type NavItem,
  type FlattenedNavItem,
  normalizeText,
  filterTree,
  collectGroupIds,
  collectActiveGroupIds,
  flattenAdminNav,
  buildAdminMenuFromCustomNav,
  applySectionColors,
  isActiveHref,
  scheduleDeferredAdminMenuSettingsHydration,
} from '../components/menu/admin-menu-utils';
import { OPEN_KEY, POPULAR_ADMIN_PREFETCH_HREFS } from '../components/menu/admin-menu-constants';
import { buildAdminNav } from '../components/admin-menu-nav';
import { useAdminMenuChatbot } from './useAdminMenuChatbot';
import { useAdminMenuSettings } from './useAdminMenuSettings';

export interface AdminMenuState {
  query: string;
  setQuery: (query: string) => void;
  isMenuCollapsed: boolean;
  pathname: string;
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
  filteredNav: NavItem[];
  effectiveOpenIds: Set<string>;
  handleToggleOpen: (id: string) => void;
  normalizedQuery: string;
  handleToggleAllFolders: () => void;
  isAnyFolderOpen: boolean;
  handleCreatePageClick: () => void;
}

export function useAdminMenuState(): AdminMenuState {
  const { isMenuCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const router = useRouter();
  const pathname = usePathname();

  const [userOpenIds, setUserOpenIds] = useState<Set<string>>(new Set());
  const [openIdsLoaded, setOpenIdsLoaded] = useState(false);
  const [closedAutoIds, setClosedAutoIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [menuSettingsReady, setMenuSettingsReady] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const hasPrefetchedPopularRoutesRef = useRef(false);

  const { handleOpenChat } = useAdminMenuChatbot(pathname.startsWith('/admin/chatbot'), setPendingHref);
  const { favoriteIds, sectionColors, customEnabled, customNav, settingsMap } = useAdminMenuSettings(menuSettingsReady);

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
    if (!openIdsLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(userOpenIds)));
    } catch (error) {
      logClientError(error);
    }
  }, [openIdsLoaded, userOpenIds]);

  useEffect(() => {
    if (pendingHref === null || pendingHref === '') return undefined;
    if (isActiveHref(pathname, pendingHref, false)) setPendingHref(null);
    return undefined;
  }, [pathname, pendingHref]);

  useEffect(() => {
    if (menuSettingsReady === true) return undefined;
    if (typeof window === 'undefined') {
      setMenuSettingsReady(true);
      return undefined;
    }

    return scheduleDeferredAdminMenuSettingsHydration(window, () => {
      setMenuSettingsReady(true);
    });
  }, [menuSettingsReady]);

  useEffect(() => {
    if (hasPrefetchedPopularRoutesRef.current === true) return undefined;
    if (typeof window === 'undefined') return undefined;

    hasPrefetchedPopularRoutesRef.current = true;
    return scheduleDeferredAdminMenuSettingsHydration(window, () => {
      POPULAR_ADMIN_PREFETCH_HREFS.forEach((href: string) => {
        if (isActiveHref(pathname, href, false)) return;
        router.prefetch(href);
      });
    });
  }, [pathname, router]);

  const handleCreatePageClick = useCallback((): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push('/admin/cms/pages/create');
  }, [router, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const baseNav = useMemo(
    () => buildAdminNav({ onOpenChat: handleOpenChat, onCreatePageClick: handleCreatePageClick }),
    [handleCreatePageClick, handleOpenChat]
  );

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

  const favoriteItems = useMemo((): NavItem[] => {
    if (favoriteIds.length === 0) return [];
    const flattened = flattenAdminNav(baseNavWithColors);
    const byId = new Map(flattened.map((entry: FlattenedNavItem) => [entry.id, entry.item]));
    const seen = new Set<string>();
    const items: NavItem[] = [];
    favoriteIds.forEach((id: string) => {
      if (seen.has(id)) return;
      const item = byId.get(id);
      if (!item) return;
      const itemWithoutChildren = { ...item };
      delete itemWithoutChildren.children;
      items.push(itemWithoutChildren);
      seen.add(id);
    });
    return items;
  }, [favoriteIds, baseNavWithColors]);

  const navWithFavorites = useMemo((): NavItem[] => {
    if (favoriteItems.length === 0) return navWithColors;
    return [
      {
        id: 'favorites',
        label: 'Favorites',
        children: favoriteItems,
      },
      ...navWithColors,
    ];
  }, [favoriteItems, navWithColors]);

  const normalizedQuery = normalizeText(deferredQuery);
  const filteredNav = useMemo<NavItem[]>(
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

  const lastPathnameForClosedRef = useRef(pathname);
  useEffect(() => {
    if (pathname === lastPathnameForClosedRef.current) return;
    lastPathnameForClosedRef.current = pathname;
    if (normalizedQuery !== '') return;
    setClosedAutoIds((prev: Set<string>) => {
      const next = new Set<string>();
      prev.forEach((id: string) => {
        if (autoOpenIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [autoOpenIds, normalizedQuery, pathname]);

  const effectiveOpenIds = useMemo(() => {
    if (normalizedQuery !== '') {
      const open = new Set<string>(userOpenIds);
      autoOpenIds.forEach((id: string) => open.add(id));
      return open;
    }
    const open = new Set<string>(userOpenIds);
    autoOpenIds.forEach((id: string) => {
      if (!closedAutoIds.has(id)) open.add(id);
    });
    return open;
  }, [autoOpenIds, closedAutoIds, normalizedQuery, userOpenIds]);

  const normalizedQueryRef = useRef(normalizedQuery);
  normalizedQueryRef.current = normalizedQuery;
  const autoOpenIdsRef = useRef(autoOpenIds);
  autoOpenIdsRef.current = autoOpenIds;
  const effectiveOpenIdsRef = useRef(effectiveOpenIds);
  effectiveOpenIdsRef.current = effectiveOpenIds;

  const isAnyFolderOpen = effectiveOpenIds.size > 0;

  const handleToggleOpen = useCallback((id: string): void => {
    if (normalizedQueryRef.current !== '') return;
    const isOpen = effectiveOpenIdsRef.current.has(id);
    if (isOpen) {
      setUserOpenIds((prev: Set<string>) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (autoOpenIdsRef.current.has(id)) {
        setClosedAutoIds((prev: Set<string>) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
      return;
    }
    setClosedAutoIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setUserOpenIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleToggleAllFolders = useCallback((): void => {
    if (normalizedQuery !== '') return;
    if (isAnyFolderOpen === true) {
      setUserOpenIds(new Set<string>());
      setClosedAutoIds(new Set<string>(autoOpenIds));
      return;
    }
    setClosedAutoIds(new Set<string>());
    setUserOpenIds(new Set<string>(allGroupIds));
  }, [allGroupIds, autoOpenIds, isAnyFolderOpen, normalizedQuery]);

  return {
    query,
    setQuery,
    isMenuCollapsed,
    pathname,
    pendingHref,
    setPendingHref,
    filteredNav,
    effectiveOpenIds,
    handleToggleOpen,
    normalizedQuery,
    handleToggleAllFolders,
    isAnyFolderOpen,
    handleCreatePageClick,
  };
}
