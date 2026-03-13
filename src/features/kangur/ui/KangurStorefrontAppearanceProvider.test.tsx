/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreGetMock } = vi.hoisted(() => ({
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => ({
      get: settingsStoreGetMock,
    }),
  };
});

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/features/kangur/storefront-appearance-settings';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

function ModeProbe(): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();

  return <div data-testid='mode-probe'>{appearance?.mode ?? 'missing'}</div>;
}

describe('KangurStorefrontAppearanceProvider', () => {
  beforeEach(() => {
    settingsStoreGetMock.mockReset();
    settingsStoreGetMock.mockReturnValue(undefined);
    window.localStorage.clear();
  });

  it('uses the stored Kangur default appearance mode when no local override exists', () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'dark';
      }
      return undefined;
    });

    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('mode-probe')).toHaveTextContent('dark');
  });

  it('prefers the viewer local override over the shared Kangur default', () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'default';
      }
      return undefined;
    });
    window.localStorage.setItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');

    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('mode-probe')).toHaveTextContent('dark');
  });
});
