/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreGetMock } = vi.hoisted(() => ({
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => ({
      get: settingsStoreGetMock,
    }),
  };
});

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY } from '@/features/kangur/storefront-appearance-settings';
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

  it('defaults to the daily appearance mode', () => {
    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('mode-probe')).toHaveTextContent('default');
  });

  it('uses the stored Kangur default appearance mode', async () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'sunset';
      }
      return undefined;
    });

    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('sunset');
    });
  });

  it('respects local override when present', async () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'default';
      }
      return undefined;
    });
    window.localStorage.setItem('kangur-storefront-appearance-mode', 'dark');

    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('dark');
    });
  });
});
