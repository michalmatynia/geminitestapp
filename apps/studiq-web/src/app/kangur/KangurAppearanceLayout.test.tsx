import { Children } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement, ReactNode } from 'react';

const {
  getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyleMock,
  getLiteSettingsForHydrationMock,
  settingsStoreProviderMock,
  storefrontAppearanceProviderMock,
} = vi.hoisted(() => ({
  getKangurStorefrontInitialStateMock: vi.fn(),
  getKangurSurfaceBootstrapStyleMock: vi.fn(),
  getLiteSettingsForHydrationMock: vi.fn(),
  settingsStoreProviderMock: vi.fn(),
  storefrontAppearanceProviderMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyle: getKangurSurfaceBootstrapStyleMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({
    children,
    initialEntries,
    mode,
    refreshSeededLiteStore,
  }: {
    children: ReactNode;
    initialEntries?: ReadonlyArray<readonly [string, string]>;
    mode?: 'admin' | 'lite';
    refreshSeededLiteStore?: boolean;
  }) => {
    settingsStoreProviderMock({ initialEntries, mode, refreshSeededLiteStore });
    return <div data-testid='settings-store-provider'>{children}</div>;
  },
}));

vi.mock('@/features/kangur/ui/KangurStorefrontAppearanceProvider', () => ({
  KangurStorefrontAppearanceProvider: ({
    children,
    initialAppearance,
  }: {
    children: ReactNode;
    initialAppearance?: {
      mode?: string;
      themeSettings?: {
        default?: string | null;
        dawn?: string | null;
        sunset?: string | null;
        dark?: string | null;
      };
    };
  }) => {
    storefrontAppearanceProviderMock({ initialAppearance });
    return <div data-testid='kangur-storefront-appearance-provider'>{children}</div>;
  },
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-class-sync'>{children}</div>
  ),
}));

describe('apps/studiq-web KangurAppearanceLayout', () => {
  beforeEach(() => {
    getKangurStorefrontInitialStateMock.mockReset();
    getKangurSurfaceBootstrapStyleMock.mockReset();
    getLiteSettingsForHydrationMock.mockReset();
    settingsStoreProviderMock.mockReset();
    storefrontAppearanceProviderMock.mockReset();
  });

  it('hydrates standalone Kangur appearance from server state and mounts the settings store', async () => {
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'sunset',
      initialThemeSettings: {
        default: '{"slot":"default"}',
        dawn: '{"slot":"dawn"}',
        sunset: '{"slot":"sunset"}',
        dark: '{"slot":"dark"}',
      },
    });
    getKangurSurfaceBootstrapStyleMock.mockReturnValue(':root{--bootstrap-style:1;}');
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode_v1', value: 'sunset' },
      { key: 'kangur_cms_theme_daily_v1', value: '{"slot":"default"}' },
      { key: 'kangur_cms_theme_dawn_v1', value: '{"slot":"dawn"}' },
      { key: 'kangur_cms_theme_sunset_v1', value: '{"slot":"sunset"}' },
      { key: 'kangur_cms_theme_nightly_v1', value: '{"slot":"dark"}' },
      { key: 'kangur_theme_daily', value: '{"accent":"daily"}' },
      { key: 'kangur_theme_default', value: '{"accent":"default"}' },
    ]);

    const { default: KangurAppearanceLayout } = await import('./KangurAppearanceLayout');
    const result = await KangurAppearanceLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
    });

    const { container } = render(result);

    expect(getKangurStorefrontInitialStateMock).toHaveBeenCalledTimes(1);
    expect(getKangurSurfaceBootstrapStyleMock).toHaveBeenCalledWith({
      mode: 'sunset',
      themeSettings: {
        default: '{"slot":"default"}',
        dawn: '{"slot":"dawn"}',
        sunset: '{"slot":"sunset"}',
        dark: '{"slot":"dark"}',
      },
    });
    expect(settingsStoreProviderMock).toHaveBeenCalledWith({
      initialEntries: [
        ['kangur_storefront_default_mode_v1', 'sunset'],
        ['kangur_cms_theme_daily_v1', '{"slot":"default"}'],
        ['kangur_cms_theme_dawn_v1', '{"slot":"dawn"}'],
        ['kangur_cms_theme_sunset_v1', '{"slot":"sunset"}'],
        ['kangur_cms_theme_nightly_v1', '{"slot":"dark"}'],
        ['kangur_theme_daily', '{"accent":"daily"}'],
        ['kangur_theme_default', '{"accent":"default"}'],
      ],
      mode: 'lite',
      refreshSeededLiteStore: false,
    });
    expect(storefrontAppearanceProviderMock).toHaveBeenCalledWith({
      initialAppearance: {
        mode: 'sunset',
        themeSettings: {
          default: '{"slot":"default"}',
          dawn: '{"slot":"dawn"}',
          sunset: '{"slot":"sunset"}',
          dark: '{"slot":"dark"}',
        },
      },
    });
    expect(screen.getByTestId('settings-store-provider')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-storefront-appearance-provider')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-surface-class-sync')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-child')).toBeInTheDocument();
    expect(container.querySelector('#__KANGUR_SURFACE_BOOTSTRAP__')?.textContent).toBe(
      ':root{--bootstrap-style:1;}'
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('escapes inline bootstrap style payloads before rendering', async () => {
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'default',
      initialThemeSettings: {
        default: null,
        dawn: null,
        sunset: null,
        dark: null,
      },
    });
    getKangurSurfaceBootstrapStyleMock.mockReturnValue('body::before{content:"<unsafe>&";}');
    getLiteSettingsForHydrationMock.mockResolvedValue([]);

    const { default: KangurAppearanceLayout } = await import('./KangurAppearanceLayout');
    const result = await KangurAppearanceLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
    });

    const fragment = result as ReactElement<{ children?: ReactNode }>;
    const nodes = Children.toArray(fragment.props.children) as Array<
      ReactElement<{
        children?: ReactNode;
        dangerouslySetInnerHTML?: { __html: string };
        id?: string;
      }>
    >;
    const styleNode = nodes.find((node) => node.props.id === '__KANGUR_SURFACE_BOOTSTRAP__');
    const inlineStyle = styleNode?.props.dangerouslySetInnerHTML?.__html ?? '';

    render(result);

    expect(settingsStoreProviderMock).toHaveBeenCalledWith({
      initialEntries: [['kangur_storefront_default_mode_v1', 'default']],
      mode: 'lite',
      refreshSeededLiteStore: true,
    });
    expect(nodes.some((node) => node.type === 'script')).toBe(false);
    expect(inlineStyle).not.toContain('<');
    expect(inlineStyle).not.toContain('&');
    expect(inlineStyle).toContain('\\u003c');
    expect(inlineStyle).toContain('\\u0026');
  });

  it('refreshes the seeded lite store when the SSR payload is missing appearance keys', async () => {
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'dawn',
      initialThemeSettings: {
        default: '{"slot":"default"}',
        dawn: '{"slot":"dawn"}',
        sunset: '{"slot":"sunset"}',
        dark: '{"slot":"dark"}',
      },
    });
    getKangurSurfaceBootstrapStyleMock.mockReturnValue(':root{--bootstrap-style:1;}');
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode_v1', value: 'dawn' },
      { key: 'kangur_theme_unrelated', value: '{"accent":"other"}' },
    ]);

    const { default: KangurAppearanceLayout } = await import('./KangurAppearanceLayout');
    const result = await KangurAppearanceLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
    });

    render(result);

    expect(settingsStoreProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'lite',
        refreshSeededLiteStore: true,
      })
    );
  });

  it('lets server-resolved appearance override stale lite theme payloads', async () => {
    getKangurStorefrontInitialStateMock.mockResolvedValue({
      initialMode: 'dark',
      initialThemeSettings: {
        default: '{"slot":"server-default"}',
        dawn: '{"slot":"server-dawn"}',
        sunset: '{"slot":"server-sunset"}',
        dark: '{"slot":"server-dark"}',
      },
    });
    getKangurSurfaceBootstrapStyleMock.mockReturnValue(':root{--bootstrap-style:1;}');
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode_v1', value: 'default' },
      { key: 'kangur_cms_theme_daily_v1', value: '{"slot":"stale-default"}' },
      { key: 'kangur_cms_theme_nightly_v1', value: '{"slot":"stale-dark"}' },
      { key: 'kangur_theme_unrelated', value: '{"accent":"other"}' },
    ]);

    const { default: KangurAppearanceLayout } = await import('./KangurAppearanceLayout');
    const result = await KangurAppearanceLayout({
      children: <div data-testid='workspace-child'>Workspace child</div>,
    });

    render(result);

    expect(settingsStoreProviderMock).toHaveBeenCalledWith({
      initialEntries: [
        ['kangur_storefront_default_mode_v1', 'dark'],
        ['kangur_cms_theme_daily_v1', '{"slot":"server-default"}'],
        ['kangur_cms_theme_nightly_v1', '{"slot":"server-dark"}'],
        ['kangur_theme_unrelated', '{"accent":"other"}'],
        ['kangur_cms_theme_dawn_v1', '{"slot":"server-dawn"}'],
        ['kangur_cms_theme_sunset_v1', '{"slot":"server-sunset"}'],
      ],
      mode: 'lite',
      refreshSeededLiteStore: true,
    });
  });
});
