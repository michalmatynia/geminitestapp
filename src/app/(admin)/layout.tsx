import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';


import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { auth, getUserPreferences } from '@/features/auth/server';
import { MasterFolderTreeRuntimeProvider } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';

export const dynamic = 'force-dynamic';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';
const ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS = (() => {
  const parsed = Number(process.env['ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS']);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1200;
})();

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  let session = null;
  try {
    session = await auth();
    if (!session?.user?.id) {
      redirect('/auth/signin');
    }
    if (session.user.accountDisabled || session.user.accountBanned) {
      redirect('/auth/signin?error=AccountDisabled');
    }
    try {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const preferencesPromise = getUserPreferences(session.user.id).catch(() => null);
      const preferences = await Promise.race([
        preferencesPromise,
        new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => resolve(null), ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS);
        }),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      if (preferences && typeof preferences.adminMenuCollapsed === 'boolean') {
        initialMenuCollapsed = preferences.adminMenuCollapsed;
      }
    } catch {
      // Fallback to cookie-derived value when preferences are unavailable.
      const cookieStore = await cookies();
      const cookieValue = cookieStore.get(ADMIN_MENU_COLLAPSED_COOKIE_KEY)?.value;
      if (cookieValue === '1' || cookieValue === 'true') {
        initialMenuCollapsed = true;
      } else if (cookieValue === '0' || cookieValue === 'false') {
        initialMenuCollapsed = false;
      }
    }
  } catch {
    redirect('/auth/signin');
  }
  return (
    <SettingsStoreProvider mode='admin'>
      <MasterFolderTreeRuntimeProvider>
        <AdminLayout session={session} initialMenuCollapsed={initialMenuCollapsed}>
          {children}
        </AdminLayout>
      </MasterFolderTreeRuntimeProvider>
    </SettingsStoreProvider>
  );
}
