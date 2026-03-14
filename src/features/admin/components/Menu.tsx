'use client';

import { StarIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import {
  useAdminLayoutActions,
  useAdminLayoutState,
} from '@/features/admin/context/AdminLayoutContext';
import type { AdminMenuCustomNode, AdminMenuColorOption } from '@/shared/contracts/admin';
import {
  useCreateChatbotSession,
  useChatbotSessions,
} from '@/shared/hooks/useAdminChatbotSessionAccess';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SearchInput, Tooltip, TreeHeader } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { buildAdminNav } from './admin-menu-nav';
import {
  type NavItem,
  type FlattenedNavItem,
  normalizeText,
  filterTree,
  collectGroupIds,
  collectActiveGroupIds,
  flattenAdminNav,
  normalizeAdminMenuCustomNav,
  buildAdminMenuFromCustomNav,
  applySectionColors,
  adminNavToCustomNav,
  getAdminMenuSections,
} from './menu/admin-menu-utils';
import {
  NavTree,
  AdminMenuTreeContext,
  AdminMenuDepthContext,
  type AdminMenuTreeContextValue,
} from './menu/NavTree';

export {
  buildAdminNav,
  normalizeAdminMenuCustomNav,
  buildAdminMenuFromCustomNav,
  flattenAdminNav,
  adminNavToCustomNav,
  getAdminMenuSections,
};
export type { AdminMenuCustomNode, NavItem, FlattenedNavItem };

export const ADMIN_MENU_COLORS: AdminMenuColorOption[] = [
  {
    value: 'slate',
    label: 'Slate',
    dot: 'bg-slate-400',
    border: 'border-slate-400/60',
    text: 'text-slate-200',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    dot: 'bg-emerald-400',
    border: 'border-emerald-400/60',
    text: 'text-emerald-200',
  },
  {
    value: 'blue',
    label: 'Blue',
    dot: 'bg-blue-400',
    border: 'border-blue-400/60',
    text: 'text-blue-200',
  },
  {
    value: 'amber',
    label: 'Amber',
    dot: 'bg-amber-400',
    border: 'border-amber-400/60',
    text: 'text-amber-200',
  },
  {
    value: 'violet',
    label: 'Violet',
    dot: 'bg-violet-400',
    border: 'border-violet-400/60',
    text: 'text-violet-200',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    dot: 'bg-cyan-400',
    border: 'border-cyan-400/60',
    text: 'text-cyan-200',
  },
  {
    value: 'orange',
    label: 'Orange',
    dot: 'bg-orange-400',
    border: 'border-orange-400/60',
    text: 'text-orange-200',
  },
  {
    value: 'rose',
    label: 'Rose',
    dot: 'bg-rose-400',
    border: 'border-rose-400/60',
    text: 'text-rose-200',
  },
];

export const ADMIN_MENU_COLOR_MAP: Record<string, AdminMenuColorOption> = Object.fromEntries(
  ADMIN_MENU_COLORS.map((option: AdminMenuColorOption) => [option.value, option])
);

const OPEN_KEY = 'adminMenuOpenIds.v2';

export default function Menu(): React.ReactNode {
  const { isMenuCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const router = useRouter();
  const pathname = usePathname();
  const shouldPrefetchChatbotSessions = pathname.startsWith('/admin/chatbot');

  const [userOpenIds, setUserOpenIds] = useState<Set<string>>(new Set());
  const [openIdsLoaded, setOpenIdsLoaded] = useState(false);
  const [closedAutoIds, setClosedAutoIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const { data: chatbotSessions = [], refetch: refetchChatbotSessions } = useChatbotSessions({
    enabled: shouldPrefetchChatbotSessions,
  });
  const { mutateAsync: createChatbotSession } = useCreateChatbotSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setUserOpenIds(
          new Set(parsed.filter((id: unknown): id is string => typeof id === 'string'))
        );
      }
    } catch {
      // ignore
    } finally {
      setOpenIdsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!openIdsLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(userOpenIds)));
    } catch {
      // ignore
    }
  }, [openIdsLoaded, userOpenIds]);

  const handleOpenChat = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      if (typeof window === 'undefined') return;
      event.preventDefault();

      const openChat = async (): Promise<void> => {
        const storedSession = window.localStorage.getItem('chatbotSessionId');
        if (storedSession) {
          router.push(`/admin/chatbot?session=${storedSession}`);
          return;
        }
        try {
          let latestId: string | undefined = chatbotSessions[0]?.id;
          if (!latestId) {
            const sessionsResult = await refetchChatbotSessions();
            latestId = sessionsResult.data?.[0]?.id;
          }
          if (latestId) {
            window.localStorage.setItem('chatbotSessionId', latestId);
            router.push(`/admin/chatbot?session=${latestId}`);
            return;
          }

          const created = await createChatbotSession({});
          if (created.sessionId) {
            window.localStorage.setItem('chatbotSessionId', created.sessionId);
            router.push(`/admin/chatbot?session=${created.sessionId}`);
          } else {
            router.push('/admin/chatbot');
          }
        } catch {
          router.push('/admin/chatbot');
        }
      };

      void openChat();
    },
    [router, chatbotSessions, createChatbotSession, refetchChatbotSessions]
  );

  const handleCreatePageClick = useCallback((): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push('/admin/cms/pages/create');
  }, [router, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const settingsStore = useSettingsStore();
  const favoriteIds = useMemo<string[]>(() => {
    const raw = settingsStore.get(ADMIN_MENU_FAVORITES_KEY);
    const parsed = parseAdminMenuJson<string[]>(raw, []);
    return parsed.filter((id: string): id is string => typeof id === 'string' && id.length > 0);
  }, [settingsStore]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const sectionColors = useMemo<Record<string, string>>(() => {
    const raw = settingsStore.get(ADMIN_MENU_SECTION_COLORS_KEY);
    const parsed = parseAdminMenuJson<Record<string, string> | null>(raw, null);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }, [settingsStore]);
  const customEnabled = useMemo(
    () => parseAdminMenuBoolean(settingsStore.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false),
    [settingsStore]
  );
  const customNav = useMemo<AdminMenuCustomNode[]>(() => {
    const raw = settingsStore.get(ADMIN_MENU_CUSTOM_NAV_KEY);
    const parsed = parseAdminMenuJson<AdminMenuCustomNode[]>(raw, []);
    return normalizeAdminMenuCustomNav(parsed);
  }, [settingsStore]);

  const baseNav = useMemo(
    () => buildAdminNav({ onOpenChat: handleOpenChat, onCreatePageClick: handleCreatePageClick }),
    [handleCreatePageClick, handleOpenChat]
  );

  const nav = useMemo(
    () => (customEnabled ? buildAdminMenuFromCustomNav(customNav, baseNav) : baseNav),
    [baseNav, customEnabled, customNav]
  );

  const navWithColors = useMemo(() => applySectionColors(nav, sectionColors), [nav, sectionColors]);
  const baseNavWithColors = useMemo(
    () => applySectionColors(baseNav, sectionColors),
    [baseNav, sectionColors]
  );

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
      const { children: _children, ...rest } = item;
      items.push(rest);
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
        icon: <StarIcon className='size-4' />,
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
      normalizedQuery
        ? collectGroupIds(filteredNav)
        : collectActiveGroupIds(navWithFavorites, pathname, favoriteIdSet),
    [favoriteIdSet, filteredNav, navWithFavorites, normalizedQuery, pathname]
  );
  const allGroupIds = useMemo(() => collectGroupIds(navWithFavorites), [navWithFavorites]);

  const [lastPathnameForClosed, setLastPathnameForClosed] = useState(pathname);
  if (pathname !== lastPathnameForClosed) {
    setLastPathnameForClosed(pathname);
    if (!normalizedQuery) {
      setClosedAutoIds((prev: Set<string>) => {
        const next = new Set<string>();
        prev.forEach((id: string) => {
          if (autoOpenIds.has(id)) next.add(id);
        });
        return next;
      });
    }
  }

  const effectiveOpenIds = useMemo(() => {
    if (normalizedQuery) {
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

  const isAnyFolderOpen = effectiveOpenIds.size > 0;

  const handleToggleOpen = useCallback(
    (id: string): void => {
      if (normalizedQuery) return;
      const isOpen = effectiveOpenIds.has(id);

      if (isOpen) {
        // One-click close, even for auto-opened "active route" folders.
        setUserOpenIds((prev: Set<string>) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (autoOpenIds.has(id)) {
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
    },
    [autoOpenIds, effectiveOpenIds, normalizedQuery]
  );

  const navTreeContextValue = useMemo<AdminMenuTreeContextValue>(
    () => ({
      isMenuCollapsed,
      pathname,
      openIds: effectiveOpenIds,
      onToggleOpen: handleToggleOpen,
    }),
    [effectiveOpenIds, handleToggleOpen, isMenuCollapsed, pathname]
  );

  const handleToggleAllFolders = useCallback((): void => {
    // While searching, folders are intentionally opened to reveal results.
    if (normalizedQuery) return;

    if (isAnyFolderOpen) {
      // Collapse everything, including auto-opened active groups.
      setUserOpenIds(new Set<string>());
      setClosedAutoIds(new Set<string>(autoOpenIds));
      return;
    }

    // Expand everything.
    setClosedAutoIds(new Set<string>());
    setUserOpenIds(new Set<string>(allGroupIds));
  }, [allGroupIds, autoOpenIds, isAnyFolderOpen, normalizedQuery]);

  return (
    <nav
      data-admin-menu
      aria-label='Admin menu'
      className={cn('flex flex-col gap-3', isMenuCollapsed ? 'items-stretch' : '')}
    >
      {!isMenuCollapsed ? (
        <TreeHeader>
          <div className='flex items-center gap-2'>
            <SearchInput
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              placeholder='Search admin pages…'
              className='h-9 flex-1 bg-gray-900/40'
              onClear={() => setQuery('')}
            />
            <Button
              variant='outline'
              size='sm'
              className='h-9 shrink-0'
              disabled={Boolean(normalizedQuery)}
              onClick={handleToggleAllFolders}
              title={normalizedQuery ? 'Clear search to toggle all folders' : undefined}
            >
              {isAnyFolderOpen ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>
          {normalizedQuery ? (
            <div className='text-[11px] text-gray-500'>
              Filtering menu: <span className='text-gray-300'>{query.trim()}</span>
            </div>
          ) : null}
        </TreeHeader>
      ) : (
        <Tooltip
          content={isAnyFolderOpen ? 'Collapse all folders' : 'Expand all folders'}
          side='right'
        >
          <div>
            <Button
              variant='outline'
              size='sm'
              className='h-9 w-full'
              disabled={Boolean(normalizedQuery)}
              onClick={handleToggleAllFolders}
            >
              {isAnyFolderOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </Tooltip>
      )}

      <AdminMenuTreeContext.Provider value={navTreeContextValue}>
        <AdminMenuDepthContext.Provider value={0}>
          <NavTree items={filteredNav} />
        </AdminMenuDepthContext.Provider>
      </AdminMenuTreeContext.Provider>
    </nav>
  );
}
