'use client';

import { ChevronLeftIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';

import { AiInsightsNotificationsDrawer } from '@/features/admin/components/AiInsightsNotificationsDrawer';
import Menu from '@/features/admin/components/Menu';
import { UserNav } from '@/features/admin/components/UserNav';
import { AdminLayoutProvider, useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { AuthProvider } from '@/features/auth';
import { useUserPreferences, useUpdateUserPreferencesMutation } from '@/features/auth/hooks/useUserPreferences';
import { NoteSettingsProvider } from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/features/observability';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Button, ToastProvider } from '@/shared/ui';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { Session } from 'next-auth';

const ADMIN_MENU_COLLAPSED_STORAGE_KEY = 'adminMenuCollapsed';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';

function AdminLayoutContent({ children }: { children: React.ReactNode }): React.ReactNode {
  const {
    isMenuCollapsed,
    isMenuHidden,
    setIsMenuCollapsed,
    isProgrammaticallyCollapsed,
    setIsProgrammaticallyCollapsed,
  } = useAdminLayout();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const didUserToggleRef = useRef(false);
  const preferredMenuCollapsedRef = useRef(isMenuCollapsed);
  const programmaticCollapsedRef = useRef(false);
  const hydratedUserRef = useRef<string | null>(null);

  const { data: preferences } = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferencesMutation();

  const persistMenuCollapsedFallbacks = useCallback((collapsed: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // ignore storage failures
    }
    try {
      document.cookie = `${ADMIN_MENU_COLLAPSED_COOKIE_KEY}=${collapsed ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      // ignore cookie failures
    }
  }, []);

  const persistMenuCollapsed = useCallback(async (collapsed: boolean): Promise<void> => {
    persistMenuCollapsedFallbacks(collapsed);
    try {
      await updatePreferencesMutation.mutateAsync({ adminMenuCollapsed: collapsed });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminLayout', action: 'persistMenuCollapsed' } });
    }
  }, [persistMenuCollapsedFallbacks, updatePreferencesMutation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY);
      if (stored !== 'true' && stored !== 'false') return;
      const storedCollapsed = stored === 'true';
      preferredMenuCollapsedRef.current = storedCollapsed;
      didUserToggleRef.current = true;
      setIsMenuCollapsed(storedCollapsed);
    } catch {
      // ignore storage failures
    }
  }, [setIsMenuCollapsed]);

  useEffect(() => {
    programmaticCollapsedRef.current = isProgrammaticallyCollapsed;
  }, [isProgrammaticallyCollapsed]);

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
  }, [
    pathname,
    isProgrammaticallyCollapsed,
    setIsMenuCollapsed,
    setIsProgrammaticallyCollapsed,
  ]);

  const handleToggleCollapse = (): void => {
    const nextCollapsed = !isMenuCollapsed;
    didUserToggleRef.current = true;
    preferredMenuCollapsedRef.current = nextCollapsed;
    setIsMenuCollapsed(nextCollapsed);
    setIsProgrammaticallyCollapsed(false);
    void persistMenuCollapsed(nextCollapsed);
  };

  const sidebarClassName = isMenuHidden
    ? 'w-0 p-0 opacity-0 pointer-events-none overflow-hidden'
    : isMenuCollapsed
      ? 'w-16 p-2 sm:w-20 sm:p-4'
      : 'w-56 p-3 xl:w-64 xl:p-4';

  const contentClassName = isMenuHidden
    ? 'ml-0'
    : isMenuCollapsed
      ? 'ml-16 sm:ml-20'
      : 'ml-56 xl:ml-64';

  return (
    <div className='dark relative h-screen w-full max-w-full overflow-hidden bg-gray-900 text-white'>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-x-hidden border-r border-gray-700/60 bg-gray-800 transition-all duration-300 ${sidebarClassName}`}
        aria-hidden={isMenuHidden}
      >
        {!isMenuHidden ? (
          <>
            <div className={`flex items-center mb-4 ${isMenuCollapsed ? 'justify-center' : 'justify-end'}`}>
              <Button
                onClick={handleToggleCollapse}
                className='p-2 rounded-full hover:bg-gray-700'
              >
                <ChevronLeftIcon
                  className={`transition-transform duration-300 ${
                    isMenuCollapsed ? 'rotate-180' : ''
                  }`}
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
        className={`relative flex h-full min-w-0 flex-col overflow-x-hidden transition-[margin-left] duration-300 ${contentClassName}`}
      >
        <header className='absolute top-0 right-0 z-10 flex h-14 items-center px-6 pointer-events-none'>
          <div className='pointer-events-auto'>
            <div className='flex items-center gap-2'>
              <div id='ai-paths-header-actions' className='flex items-center gap-2' />
              <UserNav />
            </div>
          </div>
        </header>
        <main className='min-h-0 flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto p-4'>
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
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <AdminLayoutProvider initialMenuCollapsed={initialMenuCollapsed}>
              <NoteSettingsProvider>
                <AdminLayoutContent>{children}</AdminLayoutContent>
              </NoteSettingsProvider>
            </AdminLayoutProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
