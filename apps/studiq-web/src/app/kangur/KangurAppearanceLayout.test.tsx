import { Children } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement, ReactNode } from 'react';

const {
  getKangurStorefrontInitialStateMock,
  getKangurSurfaceBootstrapStyleMock,
  kangurSurfaceHintScriptMock,
  settingsStoreProviderMock,
  storefrontAppearanceProviderMock,
} = vi.hoisted(() => ({
  getKangurStorefrontInitialStateMock: vi.fn(),
  getKangurSurfaceBootstrapStyleMock: vi.fn(),
  kangurSurfaceHintScriptMock: 'window.__kangurSurfaceHint = "<unsafe>&";',
  settingsStoreProviderMock: vi.fn(),
  storefrontAppearanceProviderMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  KANGUR_SURFACE_HINT_SCRIPT: kangurSurfaceHintScriptMock,
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

describe('apps/studiq-web KangurAppearanceLayout', () => {
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
    getKangurSurfaceBootstrapStyleMock.mockReturnValue(':root{--bootstrap-style:1;}');

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
      ':root{--bootstrap-style:1;}'
    );
    expect(container.querySelector('script')?.textContent).toContain(
      'window.__kangurSurfaceHint'
    );
  });

  it('escapes inline bootstrap script and style payloads before rendering', async () => {
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
    const scriptNode = nodes.find((node) => node.type === 'script');
    const styleNode = nodes.find((node) => node.props.id === '__KANGUR_SURFACE_BOOTSTRAP__');
    const inlineScript = scriptNode?.props.dangerouslySetInnerHTML?.__html ?? '';
    const inlineStyle = styleNode?.props.dangerouslySetInnerHTML?.__html ?? '';

    expect(inlineScript).not.toContain('<');
    expect(inlineScript).not.toContain('&');
    expect(inlineScript).toContain('window.__kangurSurfaceHint');
    expect(inlineScript).toContain('\\u003c');
    expect(inlineScript).toContain('\\u0026');
    expect(inlineStyle).not.toContain('<');
    expect(inlineStyle).not.toContain('&');
    expect(inlineStyle).toContain('\\u003c');
    expect(inlineStyle).toContain('\\u0026');
  });
});
