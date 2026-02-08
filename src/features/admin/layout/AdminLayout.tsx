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
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Button, ToastProvider } from '@/shared/ui';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { Session } from 'next-auth';

function AdminLayoutContent({ children }: { children: React.ReactNode }): React.ReactNode {
  const {
    isMenuCollapsed,
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

  const persistMenuCollapsed = useCallback(async (collapsed: boolean): Promise<void> => {
    try {
      await updatePreferencesMutation.mutateAsync({ adminMenuCollapsed: collapsed });
    } catch (error) {
      console.warn('Failed to persist menu collapse preference.', error);
    }
  }, [updatePreferencesMutation]);

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

  return (
    <div className='dark flex h-screen bg-gray-900 text-white'>
      <aside
        className={`flex h-full flex-col transition-all duration-300 bg-gray-800 p-4 ${
          isMenuCollapsed ? 'w-20' : 'w-64'
        }`}
      >
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
      </aside>
      <div className='relative flex-1 flex flex-col min-w-0'>
        <header className='absolute top-0 right-0 z-10 flex h-14 items-center px-6 pointer-events-none'>
          <div className='pointer-events-auto'>
            <div className='flex items-center gap-2'>
              <div id='ai-paths-header-actions' className='flex items-center gap-2' />
              <UserNav />
            </div>
          </div>
        </header>
        <main className='flex-1 p-4 overflow-y-auto'>
          <QueryErrorBoundary>{children}</QueryErrorBoundary>
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
