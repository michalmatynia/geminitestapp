import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import NextTopLoader from 'nextjs-toploader';

import { AdminLayout, AdminRouteLoading } from '@/features/admin/public';
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

async function AdminLayoutResolver({ children }: { children: React.ReactNode }) {
  await connection();

  const requestHeadersPromise = readOptionalRequestHeaders();
  const cookiesPromise = readOptionalRequestCookies();

  const [requestHeaders, cookieStore] = await Promise.all([
    requestHeadersPromise,
    cookiesPromise,
  ]);

  let session: Awaited<ReturnType<typeof readOptionalServerAuthSession>> = null;
  let canReadAdminSettings = false;

  try {
    session = parseAdminLayoutSessionHeaderValue(requestHeaders?.get(ADMIN_LAYOUT_SESSION_HEADER));

    if (!session?.user?.id) {
      // Header missing or invalid, now we must perform the full auth check (hits DB/Redis)
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

  let initialMenuCollapsed = false;
  let hasInitialMenuPreference = false;

  try {
    const cookieValue = cookieStore?.get(ADMIN_MENU_COLLAPSED_COOKIE_KEY)?.value;
    if (cookieValue !== undefined) {
      initialMenuCollapsed = cookieValue === '1' || cookieValue === 'true';
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
      <Suspense fallback={<AdminRouteLoading />}>{children}</Suspense>
    </AdminLayout>
  );
}

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      <NextTopLoader
        showSpinner={false}
        color='#38bdf8'
        crawlSpeed={50}
        speed={200}
        initialPosition={0.08}
        crawl={true}
        height={3}
      />
      <Suspense fallback={<AdminRouteLoading />}>
        <AdminLayoutResolver>{children}</AdminLayoutResolver>
      </Suspense>
    </>
  );
}
