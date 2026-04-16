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

import type { ReactNode } from 'react';

export default async function Layout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const initialState = await getKangurStorefrontInitialState();
  const shouldRenderAnalytics = shouldRenderVercelAnalytics();
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapStyle({
    mode: initialState?.initialMode,
    themeSettings: initialState?.initialThemeSettings,
  });

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: safeHtml(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: safeHtml(surfaceBootstrapStyle) }}
      />
      <KangurStorefrontAppearanceProvider
        initialAppearance={{
          mode: initialState?.initialMode,
          themeSettings: initialState?.initialThemeSettings,
        }}
      >
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
      {shouldRenderAnalytics ? <Analytics /> : null}
    </>
  );
}
