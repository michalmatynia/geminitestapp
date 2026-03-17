import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { auth, getUserPreferences } from '@/features/auth/server';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const dynamic = 'force-dynamic';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';
const ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS = (() => {
  const parsed = Number(process.env['ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS']);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1200;
})();
const isPlaywrightRuntime = Boolean(
  process.env['PLAYWRIGHT_RUNTIME_LEASE_KEY'] || process.env['PLAYWRIGHT_RUNTIME_AGENT_ID']
);

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  let session = null;
  let canReadAdminSettings = false;
  try {
    session = await auth();
    if (!session?.user?.id) {
      redirect('/auth/signin');
    }
    if (session.user.accountDisabled || session.user.accountBanned) {
      redirect('/auth/signin?error=AccountDisabled');
    }
    if (!session.user.roleAssigned && !isPlaywrightRuntime) {
      redirect('/auth/signin?error=AccessDenied');
    }
    canReadAdminSettings =
      session.user.isElevated || session.user.permissions?.includes('settings.manage') === true;
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
    } catch (error) {
      logClientError(error);
      // Fallback to cookie-derived value when preferences are unavailable.
      const cookieStore = await cookies();
      const cookieValue = cookieStore.get(ADMIN_MENU_COLLAPSED_COOKIE_KEY)?.value;
      if (cookieValue === '1' || cookieValue === 'true') {
        initialMenuCollapsed = true;
      } else if (cookieValue === '0' || cookieValue === 'false') {
        initialMenuCollapsed = false;
      }
    }
  } catch (error) {
    logClientError(error);
    redirect('/auth/signin');
  }
  return (
    <SettingsStoreProvider mode='admin' canReadAdminSettings={canReadAdminSettings}>
      <AdminLayout session={session} initialMenuCollapsed={initialMenuCollapsed}>
        {children}
      </AdminLayout>
    </SettingsStoreProvider>
  );
}
