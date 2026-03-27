import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

import './kangur.css';

// Inline script that adds the kangur-surface-active class to <html> and <body>
// before React hydrates. This eliminates the 600ms MutationObserver fallback
// wait in KangurAppLoader when navigating directly to /kangur routes.
const SURFACE_HINT_SCRIPT =
  'document.documentElement.classList.add(\'kangur-surface-active\');document.body.classList.add(\'kangur-surface-active\');';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SURFACE_HINT_SCRIPT }} />
      <KangurStorefrontAppearanceProvider>
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
    </>
  );
}
