'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

import { AdminFavoritesRuntimeProvider } from '@/features/admin/components/AdminFavoritesRuntimeProvider';
import {
  AdminLayoutProvider,
  useAdminLayoutActions,
  useAdminLayoutState,
} from '@/features/admin/context/AdminLayoutContext';
import { useAdminDataPrefetch } from '../hooks/useAdminDataPrefetch';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ToastProvider } from '@/shared/ui/primitives.public';
import { SkipToContentLink } from '@/shared/ui/navigation-and-layout.public';

import { useMenuPersistence } from '../hooks/useMenuPersistence';
import { useViewportHandling } from '../hooks/useViewportHandling';
import { useFocusManagement } from '../hooks/useFocusManagement';

import {
  AdminMainContent,
  AdminSidebar,
  AdminToolbar,
  getContentClassName,
  getMainPaddingClassName,
  getSidebarClassName,
  MobileMenuToggle,
} from './AdminLayoutSubcomponents';

import type { Session } from 'next-auth';

const AiInsightsNotificationsDrawer = dynamic(
  () =>
    import('@/features/admin/components/AiInsightsNotificationsDrawer').then(
      (mod) => mod.AiInsightsNotificationsDrawer
    ),
  { ssr: false }
);

function useProgrammaticMenuCollapse(
  pathname: string,
  preferredMenuCollapsedRef: React.RefObject<boolean>
): void {
  const { isProgrammaticallyCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayoutActions();

  useEffect(() => {
    if (isProgrammaticallyCollapsed && pathname !== '/admin/cms/pages/create') {
      setIsMenuCollapsed(preferredMenuCollapsedRef.current);
      setIsProgrammaticallyCollapsed(false);
    }
  }, [
    pathname,
    isProgrammaticallyCollapsed,
    setIsMenuCollapsed,
    setIsProgrammaticallyCollapsed,
    preferredMenuCollapsedRef,
  ]);
}

function AdminLayoutContent({
  children,
  hasInitialMenuPreference,
}: {
  children: React.ReactNode;
  hasInitialMenuPreference: boolean;
}): React.ReactNode {
  const { isMenuCollapsed, isMenuHidden, aiDrawerOpen } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const pathname = usePathname();

  const { handleToggleCollapse, preferredMenuCollapsedRef } =
    useMenuPersistence(hasInitialMenuPreference);

  const { isMobileViewport } = useViewportHandling();
  const { focusTrapRef, overlayMenuToggleButtonRef } = useFocusManagement(
    isMobileViewport,
    isMenuHidden
  );

  useProgrammaticMenuCollapse(pathname, preferredMenuCollapsedRef);

  const sidebarClassName = getSidebarClassName(isMenuHidden, isMobileViewport, isMenuCollapsed);
  const contentClassName = getContentClassName(isMenuHidden, isMobileViewport, isMenuCollapsed);
  const mainClassName = `min-h-0 flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto scrollbar-gutter-stable ${getMainPaddingClassName(pathname)}`;

  const toggle = (
    <MobileMenuToggle
      isMenuHidden={isMenuHidden}
      isOverlayMenu={isMobileViewport}
      overlayMenuToggleButtonRef={overlayMenuToggleButtonRef}
      setIsMenuHidden={setIsMenuHidden}
    />
  );

  return (
    <div className='dark relative h-screen w-full max-w-full overflow-hidden bg-background text-white'>
      <SkipToContentLink>Skip to content</SkipToContentLink>
      {isMobileViewport && !isMenuHidden && (
        <button
          type='button'
          aria-label='Close admin menu'
          onClick={() => setIsMenuHidden(true)}
          className='fixed inset-0 z-20 bg-black/50'
        />
      )}
      <AdminSidebar
        focusTrapRef={focusTrapRef as React.RefObject<HTMLElement | null>}
        isMenuHidden={isMenuHidden}
        isMenuCollapsed={isMenuCollapsed}
        sidebarClassName={sidebarClassName}
        handleToggleCollapse={handleToggleCollapse}
      />
      <div
        className={`relative flex h-full min-w-0 flex-col overflow-x-hidden transition-[padding-left] duration-300 ${contentClassName}`}
        data-scroll-focus-ignore='true'
      >
        <AdminToolbar mobileMenuToggle={toggle} />
        <AdminMainContent pathname={pathname} mainClassName={mainClassName}>
          {children}
        </AdminMainContent>
        {aiDrawerOpen && <AiInsightsNotificationsDrawer />}
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  initialMenuCollapsed = false,
  hasInitialMenuPreference = false,
  session = null,
  canReadAdminSettings = true,
}: {
  children: React.ReactNode;
  initialMenuCollapsed?: boolean;
  hasInitialMenuPreference?: boolean;
  session?: Session | null;
  canReadAdminSettings?: boolean;
}): React.ReactNode {
  const { warmup } = useAdminDataPrefetch();

  useEffect(() => {
    warmup();
  }, [warmup]);

  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <ToastProvider>
        <QueryProvider>
          <SettingsStoreProvider mode='admin' canReadAdminSettings={canReadAdminSettings}>
            <AdminLayoutProvider initialMenuCollapsed={initialMenuCollapsed}>
              <AdminFavoritesRuntimeProvider>
                <AdminLayoutContent hasInitialMenuPreference={hasInitialMenuPreference}>
                  {children}
                </AdminLayoutContent>
              </AdminFavoritesRuntimeProvider>
            </AdminLayoutProvider>
          </SettingsStoreProvider>
        </QueryProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
