import {
  KANGUR_SURFACE_HINT_SCRIPT,
  escapeForInlineScript,
  getKangurSurfaceBootstrapFallbackStyle,
} from '@/lib/kangur-surface-bootstrap';

import './kangur.css';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

export default function KangurLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapFallbackStyle();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: escapeForInlineScript(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: escapeForInlineScript(surfaceBootstrapStyle) }}
      />
      <KangurStorefrontAppearanceProvider>
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
    </>
  );
}
