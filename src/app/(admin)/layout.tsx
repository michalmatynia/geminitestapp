import { redirect } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';

import { AdminLayout } from '@/features/admin/public';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { ADMIN_LAYOUT_SESSION_HEADER, parseAdminLayoutSessionHeaderValue } from '@/shared/lib/auth/admin-layout-session';
import { readOptionalRequestCookies } from '@/shared/lib/request/optional-cookies';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { JSX } from 'react';


const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';
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
  let hasInitialMenuPreference = false;
  let session: Awaited<ReturnType<typeof readOptionalServerAuthSession>> = null;
  let canReadAdminSettings = false;
  try {
    const requestHeaders = await readOptionalRequestHeaders();
    session = parseAdminLayoutSessionHeaderValue(requestHeaders?.get(ADMIN_LAYOUT_SESSION_HEADER));

    if (!session?.user?.id) {
      session = await readOptionalServerAuthSession();
    }
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
  canReadAdminSettings =
    session.user.isElevated || session.user.permissions?.includes('settings.manage') === true;
  try {
    const cookieValue = await readAdminMenuCollapsedCookie();
    if (cookieValue !== null) {
      initialMenuCollapsed = cookieValue;
      hasInitialMenuPreference = true;
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'admin.layout',
      source: 'admin.layout',
      action: 'loadAdminLayoutCookieState',
    });
  }
  const shouldEnableAdminSettingsStore = canReadAdminSettings || isPlaywrightRuntime;
  return (
    <AdminLayout
      session={session}
      initialMenuCollapsed={initialMenuCollapsed}
      hasInitialMenuPreference={hasInitialMenuPreference}
      canReadAdminSettings={shouldEnableAdminSettingsStore}
    >
      {children}
    </AdminLayout>
  );
}
hildren}
      </AdminLayout>
    </>
  );
}
