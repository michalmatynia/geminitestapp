import { redirect } from 'next/navigation';

import { AdminLayout } from '@/features/admin/public';
import { getUserPreferences } from '@/features/auth/server';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';
import { readOptionalRequestCookies } from '@/shared/lib/request/optional-cookies';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { JSX } from 'react';


export const dynamic = 'force-dynamic';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';
const ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS = (() => {
  const parsed = Number(process.env['ADMIN_LAYOUT_USER_PREFERENCES_TIMEOUT_MS']);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1200;
})();
const isPlaywrightRuntime = Boolean(
  process.env['PLAYWRIGHT_RUNTIME_LEASE_KEY'] || process.env['PLAYWRIGHT_RUNTIME_AGENT_ID']
);

const readAdminMenuCollapsedCookie = async (): Promise<boolean | null> => {
  const cookieStore = await readOptionalRequestCookies();
  const cookieValue = cookieStore?.get(ADMIN_MENU_COLLAPSED_COOKIE_KEY)?.value;

  if (cookieValue === '1' || cookieValue === 'true') {
    return true;
  }
  if (cookieValue === '0' || cookieValue === 'false') {
    return false;
  }

  return null;
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  let session: Awaited<ReturnType<typeof readOptionalServerAuthSession>> = null;
  let canReadAdminSettings = false;
  try {
    session = await readOptionalServerAuthSession();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'admin.layout',
      source: 'admin.layout',
      action: 'loadAdminLayout',
    });
    redirect('/auth/signin');
  }

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
    } else {
      const cookieValue = await readAdminMenuCollapsedCookie();
      if (cookieValue !== null) {
        initialMenuCollapsed = cookieValue;
      }
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'admin.layout',
      source: 'admin.layout',
      action: 'loadUserPreferences',
    });
    // Fallback to cookie-derived value when preferences are unavailable.
    const cookieValue = await readAdminMenuCollapsedCookie();
    if (cookieValue !== null) {
      initialMenuCollapsed = cookieValue;
    }
  }
  const shouldEnableAdminSettingsStore = canReadAdminSettings || isPlaywrightRuntime;
  return (
    <AdminLayout
      session={session}
      initialMenuCollapsed={initialMenuCollapsed}
      canReadAdminSettings={shouldEnableAdminSettingsStore}
    >
      {children}
    </AdminLayout>
  );
}
