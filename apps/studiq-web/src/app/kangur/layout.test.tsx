import { render, screen } from '@testing-library/react';

import type { ReactNode } from 'react';

const getKangurStorefrontInitialStateMock = vi.fn();
const getKangurSurfaceBootstrapStyleMock = vi.fn();
const settingsStoreProviderMock = vi.fn();
const storefrontAppearanceProviderMock = vi.fn();

vi.mock('@/features/kangur/server', () => ({
  KANGUR_SURFACE_HINT_SCRIPT: 'window.__kangurSurfaceHint = true;',
  getKangurStorefrontInitialState: getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyle: getKangurSurfaceBootstrapStyleMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({
    children,
    mode,
  }: {
    children: ReactNode;
    mode?: 'admin' | 'lite';
  }) => {
    settingsStoreProviderMock({ mode });
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

describe('apps/studiq-web Kangur layout', () => {
  beforeEach(() => {
    getKangurStorefrontInitialStateMock.mockReset();
    getKangurSurfaceBootstrapStyleMock.mockReset();
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
    getKangurSurfaceBootstrapStyleMock.mockReturnValue('--bootstrap-style: 1;');

    const { default: KangurLayout } = await import('./layout');
    const result = await KangurLayout({
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
    expect(settingsStoreProviderMock).toHaveBeenCalledWith({ mode: 'lite' });
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
      '--bootstrap-style: 1;'
    );
    expect(container.querySelector('script')?.textContent).toContain('window.__kangurSurfaceHint = true;');
  });
});
