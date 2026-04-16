/*
 * StudiQ (Kangur) frontend layout
 *
 * Purpose: Server layout that bootstraps Kangur storefront appearance, surface
 * styles and analytics. Keep this file server-only and avoid client-side hooks
 * here so hydration remains predictable.
 *
 * Accessibility notes:
 * - Surface bootstrap should not interfere with focus order.
 * - Ensure that child pages render a single <main> landmark and provide a
 *   meaningful H1 where appropriate (Kangur page shells enforce this via
 *   KangurStandardPageLayout / KangurAliasAppLayout).
 * - Do not add interactive UI here; keep interactions inside the page shell
 *   components so keyboard and focus management can be localized and tested.
 */
import {
  getKangurStorefrontInitialState,
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server';
import { KangurStorefrontAppearanceProvider, KangurSurfaceClassSync } from '@/features/kangur/public';
import { shouldRenderVercelAnalytics } from '@/shared/lib/analytics/vercel-analytics';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { Analytics } from '@vercel/analytics/next';

import { Suspense, use, type ReactNode } from 'react';

type KangurLayoutShellProps = {
  children: ReactNode;
  initialAppearance?: {
    mode?: NonNullable<Awaited<ReturnType<typeof getKangurStorefrontInitialState>>>['initialMode'];
    themeSettings?: NonNullable<
      Awaited<ReturnType<typeof getKangurStorefrontInitialState>>
    >['initialThemeSettings'];
  };
};

function KangurLayoutShell({
  children,
  initialAppearance,
}: KangurLayoutShellProps): React.JSX.Element {
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapStyle(initialAppearance);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: safeHtml(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: safeHtml(surfaceBootstrapStyle) }}
      />
      <KangurStorefrontAppearanceProvider initialAppearance={initialAppearance}>
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
    </>
  );
}

type KangurLayoutProps = {
  children: ReactNode;
};

export async function resolveKangurLayoutView({
  children,
}: KangurLayoutProps): Promise<React.JSX.Element> {
  const initialState = await getKangurStorefrontInitialState();

  return (
    <KangurLayoutShell
      initialAppearance={{
        mode: initialState?.initialMode,
        themeSettings: initialState?.initialThemeSettings,
      }}
    >
      {children}
    </KangurLayoutShell>
  );
}

function KangurLayoutRuntime({
  layoutViewPromise,
}: {
  layoutViewPromise: Promise<React.JSX.Element>;
}): React.JSX.Element {
  return use(layoutViewPromise);
}

export default function Layout({ children }: KangurLayoutProps): React.JSX.Element {
  const shouldRenderAnalytics = shouldRenderVercelAnalytics();
  const layoutViewPromise = resolveKangurLayoutView({ children });

  return (
    <>
      <Suspense fallback={<KangurLayoutShell>{children}</KangurLayoutShell>}>
        <KangurLayoutRuntime layoutViewPromise={layoutViewPromise} />
      </Suspense>
      {shouldRenderAnalytics ? <Analytics /> : null}
    </>
  );
}
