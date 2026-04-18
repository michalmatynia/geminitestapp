import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import {
  getKangurStorefrontInitialState,
  getKangurSurfaceBootstrapStyle,
  KANGUR_SURFACE_HINT_SCRIPT,
} from '@/features/kangur/server';
import { escapeForInlineScript } from '../../lib/kangur-surface-bootstrap';

import './kangur.css';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

export default async function KangurAppearanceLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const initialState = await getKangurStorefrontInitialState();
  const initialAppearance = {
    mode: initialState.initialMode,
    themeSettings: initialState.initialThemeSettings,
  };
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapStyle(initialAppearance);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: escapeForInlineScript(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: escapeForInlineScript(surfaceBootstrapStyle) }}
      />
      <SettingsStoreProvider mode='lite'>
        <KangurStorefrontAppearanceProvider initialAppearance={initialAppearance}>
          <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
        </KangurStorefrontAppearanceProvider>
      </SettingsStoreProvider>
    </>
  );
}
