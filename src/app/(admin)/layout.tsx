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
const isPlaywrightRuntime =
  (process.env['PLAYWRIGHT_RUNTIME_LEASE_KEY'] ?? '') !== '' ||
  (process.env['PLAYWRIGHT_RUNTIME_AGENT_ID'] ?? '') !== '';

async function resolveSession(requestHeaders: Headers | null): Promise<Awaited<ReturnType<typeof readOptionalServerAuthSession>>> {
  try {
    const headerValue = requestHeaders?.get(ADMIN_LAYOUT_SESSION_HEADER);
    let session = typeof headerValue === 'string' ? parseAdminLayoutSessionHeaderValue(headerValue) : null;

    const sessionUserId = session?.user?.id;
    if (typeof sessionUserId !== 'string' || sessionUserId === '') {
      // Header missing or invalid, now we must perform the full auth check (hits DB/Redis)
      session = await readOptionalServerAuthSession();
    }
    return session;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'admin.layout',
      source: 'admin.layout',
      action: 'loadAdminLayout',
    });
    redirect('/auth/signin');
    return null;
  }
}

async function resolveMenuState(cookieStore: Awaited<ReturnType<typeof readOptionalRequestCookies>>): Promise<{ initialMenuCollapsed: boolean; hasInitialMenuPreference: boolean }> {
  let initialMenuCollapsed = false;
  let hasInitialMenuPreference = false;

  try {
    const cookieValue = cookieStore?.get(ADMIN_MENU_COLLAPSED_COOKIE_KEY)?.value;
    if (cookieValue !== undefined) {
      initialMenuCollapsed = cookieValue === '1' || cookieValue === 'true';
      hasInitialMenuPreference = true;
    }
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'admin.layout',
      source: 'admin.layout',
      action: 'loadAdminLayoutCookieState',
    });
  }

  return { initialMenuCollapsed, hasInitialMenuPreference };
}

export async function AdminLayoutResolver({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  await connection();

  const [requestHeaders, cookieStore] = await Promise.all([
    readOptionalRequestHeaders(),
    readOptionalRequestCookies(),
  ]);

  const session = await resolveSession(requestHeaders);

  const userId = session?.user?.id;
  if (typeof userId !== 'string' || userId === '') {
    redirect('/auth/signin');
  }

  const { initialMenuCollapsed, hasInitialMenuPreference } = await resolveMenuState(cookieStore);

  const isElevated = session.user.isElevated === true;
  const hasSettingsPermission = session.user.permissions?.includes('settings.manage') === true;
  const canReadAdminSettings = isElevated || hasSettingsPermission;

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
