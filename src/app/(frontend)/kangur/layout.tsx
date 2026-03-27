import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { Analytics } from '@vercel/analytics/next';

import type { ReactNode } from 'react';

import './kangur.css';

// Inline script that adds the kangur-surface-active class to <html> and <body>
// before React hydrates. This eliminates the MutationObserver fallback
// wait in KangurAppLoader when navigating directly to /kangur routes.
const SURFACE_HINT_SCRIPT =
  'document.documentElement.classList.add(\'kangur-surface-active\');document.body.classList.add(\'kangur-surface-active\');';

export default async function Layout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const initialState = await getKangurStorefrontInitialState();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: safeHtml(SURFACE_HINT_SCRIPT) }} />
      <KangurStorefrontAppearanceProvider
        initialAppearance={{
          mode: initialState?.initialMode,
          themeSettings: initialState?.initialThemeSettings,
        }}
      >
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
      <Analytics />
    </>
  );
}
