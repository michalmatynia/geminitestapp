import {
  getKangurStorefrontInitialState,
} from '@/features/kangur/server';
import {
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server/storefront-appearance-bootstrap';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/public';
import { KangurSurfaceClassSync } from '@/features/kangur/public';
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
