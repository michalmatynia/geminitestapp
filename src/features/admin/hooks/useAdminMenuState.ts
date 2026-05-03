import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { usePathname } from 'next/navigation';

import { useAdminLayoutActions, useAdminLayoutState } from '@/features/admin/context/AdminLayoutContext';

import type { NavItem } from '../components/menu/admin-menu-utils';
import { buildAdminNav } from '../components/admin-menu-nav';
import {
  useAdminMenuFilteredNav,
  useAdminMenuOpenState,
  useAdminMenuSettingsReady,
  usePrefetchPopularAdminRoutes,
  useResetPendingAdminHref,
  useStoredAdminMenuOpenIds,
} from './admin-menu-state-helpers';
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
  const [query, setQuery] = useState('');
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { setUserOpenIds, userOpenIds } = useStoredAdminMenuOpenIds();
  const menuSettingsReady = useAdminMenuSettingsReady();

  const { handleOpenChat } = useAdminMenuChatbot(pathname.startsWith('/admin/chatbot'), setPendingHref);
  const { favoriteIds, sectionColors, customEnabled, customNav } = useAdminMenuSettings(menuSettingsReady);
  useResetPendingAdminHref(pathname, pendingHref, setPendingHref);
  usePrefetchPopularAdminRoutes(pathname, router.prefetch);

  const handleCreatePageClick = useCallback((): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push('/admin/cms/pages/create');
  }, [router, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const baseNav = useMemo(
    () => buildAdminNav({ onOpenChat: handleOpenChat, onCreatePageClick: handleCreatePageClick }),
    [handleCreatePageClick, handleOpenChat]
  );
  const { filteredNav, normalizedQuery, autoOpenIds, allGroupIds } = useAdminMenuFilteredNav({
    baseNav,
    customEnabled,
    customNav,
    favoriteIds,
    pathname,
    query: deferredQuery,
    sectionColors,
  });
  const { effectiveOpenIds, handleToggleAllFolders, handleToggleOpen, isAnyFolderOpen } =
    useAdminMenuOpenState({
      allGroupIds,
      autoOpenIds,
      normalizedQuery,
      pathname,
      setUserOpenIds,
      userOpenIds,
    });

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
