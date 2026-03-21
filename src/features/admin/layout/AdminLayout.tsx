'use client';

import { ChevronLeftIcon, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AiInsightsNotificationsDrawer } from '@/features/admin/components/AiInsightsNotificationsDrawer';
import Menu from '@/features/admin/components/Menu';
import { UserNav } from '@/features/admin/components/UserNav';
import {
  AdminLayoutProvider,
  useAdminLayoutActions,
  useAdminLayoutState,
} from '@/features/admin/context/AdminLayoutContext';
import { useUpdateUserPreferences, useUserPreferences } from '@/shared/hooks/useUserPreferences';
import { setClientCookie } from '@/shared/lib/browser/client-cookies';
import { NoteSettingsProvider } from '@/shared/providers/NoteSettingsProvider';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Button, ToastProvider } from '@/shared/ui';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

import type { Session } from 'next-auth';

const ADMIN_MENU_COLLAPSED_STORAGE_KEY = 'adminMenuCollapsed';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';

function AdminLayoutContent({ children }: { children: React.ReactNode }): React.ReactNode {
  const { isMenuCollapsed, isMenuHidden, isProgrammaticallyCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed, setIsMenuHidden, setIsProgrammaticallyCollapsed } =
    useAdminLayoutActions();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const didUserToggleRef = useRef(false);
  const preferredMenuCollapsedRef = useRef(isMenuCollapsed);
  const programmaticCollapsedRef = useRef(false);
  const hydratedUserRef = useRef<string | null>(null);
  const lastDesktopMenuHiddenRef = useRef(isMenuHidden);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const { data: preferences } = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferences();

  const persistMenuCollapsedFallbacks = useCallback((collapsed: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch (error) {
      logClientError(error);
    
      // ignore storage failures
    }
    try {
      setClientCookie(ADMIN_MENU_COLLAPSED_COOKIE_KEY, collapsed ? '1' : '0', {
        maxAgeSeconds: 31536000,
      });
    } catch (error) {
      logClientError(error);
    
      // ignore cookie failures
    }
  }, []);

  const persistMenuCollapsed = useCallback(
    async (collapsed: boolean): Promise<void> => {
      persistMenuCollapsedFallbacks(collapsed);
      try {
        await updatePreferencesMutation.mutateAsync({ adminMenuCollapsed: collapsed });
      } catch (error) {
        logClientCatch(error, { source: 'AdminLayout', action: 'persistMenuCollapsed' });
      }
    },
    [persistMenuCollapsedFallbacks, updatePreferencesMutation]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY);
      if (stored !== 'true' && stored !== 'false') return;
      const storedCollapsed = stored === 'true';
      preferredMenuCollapsedRef.current = storedCollapsed;
      didUserToggleRef.current = true;
      setIsMenuCollapsed(storedCollapsed);
    } catch (error) {
      logClientError(error);
    
      // ignore storage failures
    }
  }, [setIsMenuCollapsed]);

  useEffect(() => {
    programmaticCollapsedRef.current = isProgrammaticallyCollapsed;
  }, [isProgrammaticallyCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(max-width: 1023px)');
    const applyMatch = (matches: boolean): void => {
      setIsMobileViewport(matches);
    };

    applyMatch(media.matches);

    const handler = (event: MediaQueryListEvent): void => {
      applyMatch(event.matches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
      return (): void => {
        media.removeEventListener('change', handler);
      };
    }

    media.addListener(handler);
    return (): void => {
      media.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      lastDesktopMenuHiddenRef.current = isMenuHidden;
    }
  }, [isMobileViewport, isMenuHidden]);

  useEffect(() => {
    if (isMobileViewport) {
      setIsMenuHidden(true);
      return;
    }

    setIsMenuHidden(lastDesktopMenuHiddenRef.current);
  }, [isMobileViewport, setIsMenuHidden]);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (status !== 'authenticated' || !userId || hydratedUserRef.current === userId) return;

    if (preferences && typeof preferences.adminMenuCollapsed === 'boolean') {
      if (didUserToggleRef.current || programmaticCollapsedRef.current) return;
      preferredMenuCollapsedRef.current = preferences.adminMenuCollapsed;
      setIsMenuCollapsed(preferences.adminMenuCollapsed);
      hydratedUserRef.current = userId;
    }
  }, [session, status, preferences, setIsMenuCollapsed]);

  useEffect(() => {
    if (isProgrammaticallyCollapsed && pathname !== '/admin/cms/pages/create') {
      setIsMenuCollapsed(preferredMenuCollapsedRef.current);
      setIsProgrammaticallyCollapsed(false);
    }
  }, [pathname, isProgrammaticallyCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const handleToggleCollapse = (): void => {
    const nextCollapsed = !isMenuCollapsed;
    didUserToggleRef.current = true;
    preferredMenuCollapsedRef.current = nextCollapsed;
    setIsMenuCollapsed(nextCollapsed);
    setIsProgrammaticallyCollapsed(false);
    void persistMenuCollapsed(nextCollapsed);
  };

  const isOverlayMenu = isMobileViewport;
  const sidebarClassName = isMenuHidden
    ? 'w-0 p-0 opacity-0 pointer-events-none overflow-hidden'
    : isOverlayMenu
      ? 'w-[min(85vw,20rem)] p-3 md:w-[22rem] md:p-4'
      : isMenuCollapsed
        ? 'w-16 p-2 sm:w-20 sm:p-4'
        : 'w-56 p-3 xl:w-64 xl:p-4';

  const contentClassName =
    isMenuHidden || isOverlayMenu
      ? 'pl-0'
      : isMenuCollapsed
        ? 'pl-16 sm:pl-20'
        : 'pl-56 xl:pl-64';
  const isEmbeddedKangurRoute =
    pathname === '/admin/kangur' ||
    (pathname.startsWith('/admin/kangur/') &&
      !pathname.startsWith('/admin/kangur/lessons-manager'));
  const isProductsListRoute =
    pathname === '/admin/products' ||
    pathname === '/admin/validator' ||
    pathname === '/admin/validator/lists' ||
    pathname === '/admin/ai-paths/queue' ||
    pathname === '/admin/system/logs';
  const mainPaddingClassName = isProductsListRoute
    ? 'p-6'
    : isEmbeddedKangurRoute
      ? 'pt-6'
      : 'p-4 pt-16';
  const mainClassName = `min-h-0 flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto scrollbar-gutter-stable ${mainPaddingClassName}`;

  const mobileMenuToggleLabel = isMenuHidden ? 'Open admin menu' : 'Close admin menu';
  const mobileMenuToggle = isOverlayMenu ? (
    <Button
      variant='ghost'
      onClick={() => setIsMenuHidden(!isMenuHidden)}
      className='h-9 w-9 rounded-full border border-border/60 bg-muted/40 hover:bg-muted/60'
      aria-controls='admin-sidebar'
      aria-expanded={!isMenuHidden}
      aria-label={mobileMenuToggleLabel}
      title={mobileMenuToggleLabel}
    >
      {isMenuHidden ? <MenuIcon className='h-4 w-4' /> : <CloseIcon className='h-4 w-4' />}
    </Button>
  ) : null;

  return (
    <div className='dark relative h-screen w-full max-w-full overflow-hidden bg-background text-white'>
      {isOverlayMenu && !isMenuHidden ? (
        <button
          type='button'
          aria-label='Close admin menu'
          onClick={() => setIsMenuHidden(true)}
          className='fixed inset-0 z-20 bg-black/50'
        />
      ) : null}
      <aside
        id='admin-sidebar'
        aria-label='Admin sidebar'
        className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-x-hidden border-r border-border/70 bg-slate-900/95 backdrop-blur transition-all duration-300 ${sidebarClassName}`}
        aria-hidden={isMenuHidden}
      >
        {!isMenuHidden ? (
          <>
            <div
              className={`flex items-center mb-4 ${isMenuCollapsed ? 'justify-center' : 'justify-end'}`}
            >
              <Button
                variant='ghost'
                onClick={handleToggleCollapse}
                className='p-2 rounded-full hover:bg-muted/40'
                aria-controls='admin-sidebar'
                aria-expanded={!isMenuCollapsed}
                aria-label={isMenuCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
                title={isMenuCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}>
                <ChevronLeftIcon
                  className={`transition-transform duration-300 ${
                    isMenuCollapsed ? 'rotate-180' : ''
                  }`}
                  aria-hidden='true'
                />
              </Button>
            </div>
            <div className='flex-1 overflow-y-auto pr-1'>
              <Menu />
            </div>
          </>
        ) : null}
      </aside>
      <div
        className={`relative flex h-full min-w-0 flex-col overflow-x-hidden transition-[padding-left] duration-300 ${contentClassName}`}
      >
        <header
          className='absolute top-0 right-0 z-[90] flex h-14 items-center px-6 pointer-events-none'
          aria-label='Admin toolbar'
        >
          <div className='pointer-events-auto'>
            <div className='flex items-center gap-2'>
              <div id='ai-paths-header-actions' className='flex items-center gap-2' />
              {mobileMenuToggle}
              <UserNav />
            </div>
          </div>
        </header>
        <main
          id='app-content'
          tabIndex={-1}
          className={`${mainClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
        >
          <span tabIndex={0} className='sr-only focus:not-sr-only'>
            Admin content start
          </span>
          <QueryErrorBoundary>
            <div className='min-w-0 max-w-full'>{children}</div>
          </QueryErrorBoundary>
        </main>
        <AiInsightsNotificationsDrawer />
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  initialMenuCollapsed = false,
  session = null,
}: {
  children: React.ReactNode;
  initialMenuCollapsed?: boolean;
  session?: Session | null;
}): React.ReactNode {
  const menuCollapsedDefault = initialMenuCollapsed;

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ToastProvider>
          <AdminLayoutProvider initialMenuCollapsed={menuCollapsedDefault}>
            <NoteSettingsProvider>
              <AdminLayoutContent>{children}</AdminLayoutContent>
            </NoteSettingsProvider>
          </AdminLayoutProvider>
        </ToastProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
