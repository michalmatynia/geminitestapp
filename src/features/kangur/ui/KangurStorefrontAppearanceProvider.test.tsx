/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreGetMock } = vi.hoisted(() => ({
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
}));

const originalPersistEnv = process.env['NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST'];
const setEnvValue = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

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
import {
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/features/kangur/appearance/storefront-appearance-settings';
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
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', originalPersistEnv);
  });

  afterEach(() => {
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', originalPersistEnv);
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

  it('ignores local override by default so Mongo-backed mode stays authoritative', async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('default');
    });
  });

  it('respects local override when persistence is explicitly enabled by env', async () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'default';
      }
      return undefined;
    });
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', 'true');
    window.localStorage.setItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');

    render(
      <KangurStorefrontAppearanceProvider>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('dark');
    });
  });

  it('lets the provider force Mongo-backed mode even when env persistence is enabled', async () => {
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', 'true');
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'sunset';
      }
      return undefined;
    });
    window.localStorage.setItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');

    render(
      <KangurStorefrontAppearanceProvider persistMode={false}>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('sunset');
    });
  });

  it('supports explicit persistence opt-in without relying on env', async () => {
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY) {
        return 'default';
      }
      return undefined;
    });
    window.localStorage.setItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY, 'dark');

    render(
      <KangurStorefrontAppearanceProvider persistMode>
        <ModeProbe />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-probe')).toHaveTextContent('dark');
    });
  });
});
