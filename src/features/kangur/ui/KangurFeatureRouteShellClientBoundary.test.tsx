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
  const actual =
    await importOriginal<typeof import('@/features/kangur/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => ({
      get: settingsStoreGetMock,
    }),
  };
});

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', async () => {
  const { useKangurStorefrontAppearance } = await import(
    '@/features/kangur/ui/useKangurStorefrontAppearance'
  );

  return {
    KangurFeatureRouteShell: () => {
      const appearance = useKangurStorefrontAppearance();

      return (
        <div
          data-testid='kangur-feature-route-shell'
          data-background={appearance.theme.backgroundColor}
        >
          Kangur route shell
        </div>
      );
    },
  };
});

import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

describe('KangurFeatureRouteShellClientBoundary', () => {
  beforeEach(() => {
    settingsStoreGetMock.mockReset();
    settingsStoreGetMock.mockReturnValue(undefined);
    vi.resetModules();
  });

  it('renders nothing until the route shell module resolves', async () => {
    const { KangurFeatureRouteShellClientBoundary } = await import(
      './KangurFeatureRouteShellClientBoundary'
    );

    render(<KangurFeatureRouteShellClientBoundary />);

    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    });
  });

  it('inherits the parent storefront appearance snapshot instead of resetting it', async () => {
    const { KangurFeatureRouteShellClientBoundary } = await import(
      './KangurFeatureRouteShellClientBoundary'
    );
    const initialThemeRaw = serializeSetting({
      backgroundColor: '#123456',
      primaryColor: '#4f46e5',
    });

    render(
      <KangurStorefrontAppearanceProvider
        initialAppearance={{
          mode: 'default',
          themeSettings: { default: initialThemeRaw },
        }}
      >
        <KangurFeatureRouteShellClientBoundary />
      </KangurStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-feature-route-shell')).toHaveAttribute(
        'data-background',
        '#123456'
      );
    });
  });
});
