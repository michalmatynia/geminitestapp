import {
  KANGUR_SURFACE_HINT_SCRIPT,
  escapeForInlineScript,
} from '@/lib/kangur-surface-bootstrap';
import {
  getKangurStorefrontInitialState,
  getKangurSurfaceBootstrapStyle,
} from '@/features/kangur/server';

import './kangur.css';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

export default async function KangurLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const kangurInitialState = await getKangurStorefrontInitialState();
  const initialAppearance = {
    mode: kangurInitialState.initialMode,
    themeSettings: kangurInitialState.initialThemeSettings,
  };
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapStyle(initialAppearance);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: escapeForInlineScript(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: escapeForInlineScript(surfaceBootstrapStyle) }}
      />
      <KangurStorefrontAppearanceProvider initialAppearance={initialAppearance}>
        <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
    </>
  );
}
