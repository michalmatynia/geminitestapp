/**
 * @vitest-environment jsdom
 */

import { Children } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const { queryProviderMock, kangurLoadingFallbackMock, getLiteSettingsForHydrationMock } = vi.hoisted(() => ({
  queryProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  kangurLoadingFallbackMock: vi.fn(() => <div data-testid='kangur-loading-fallback' />),
  getLiteSettingsForHydrationMock: vi.fn(),
}));

vi.mock('../providers/QueryProvider', () => ({
  StudiqQueryProvider: queryProviderMock,
}));

vi.mock('../components/KangurLoadingFallback', () => ({
  default: kangurLoadingFallbackMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

describe('apps/studiq-web RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLiteSettingsForHydrationMock.mockResolvedValue([]);
  });

  it('keeps the root shell structural and leaves locale ownership to nested Kangur layouts', async () => {
    const { default: RootLayout } = await import('./layout');

    const layout = await RootLayout({
      children: <div data-testid='child'>child</div>,
    });
    const htmlElement = layout as ReactElement<{ children?: ReactNode; lang?: string }>;
    const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
    const bodyChildren = Children.toArray(bodyElement.props.children) as ReactElement[];
    const suspenseElement = bodyChildren.at(-1) as ReactElement<{
      children?: ReactNode;
      fallback?: ReactNode;
    }>;
    const queryProviderElement = Children.only(suspenseElement.props.children) as ReactElement<{
      children?: ReactNode;
    }>;
    const mainElement = Children.only(queryProviderElement.props.children) as ReactElement<{
      children?: ReactNode;
      id?: string;
    }>;

    expect(htmlElement.props.lang).toBe('pl');
    expect(queryProviderElement.type).toBe(queryProviderMock);
    expect(mainElement.props.id).toBe('kangur-main-content');
    expect((suspenseElement.props.fallback as ReactElement).type).toBe(kangurLoadingFallbackMock);
  });

  it('injects lite settings hydration script when SSR data is available', async () => {
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode', value: 'default' },
    ]);

    const { default: RootLayout } = await import('./layout');

    const layout = await RootLayout({
      children: <div data-testid='child'>child</div>,
    });
    const htmlElement = layout as ReactElement<{ children?: ReactNode }>;
    const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
    const bodyChildren = Children.toArray(bodyElement.props.children) as ReactElement[];
    const scriptElement = bodyChildren[0] as ReactElement<{
      dangerouslySetInnerHTML?: { __html: string };
    }>;

    expect(getLiteSettingsForHydrationMock).toHaveBeenCalledTimes(1);
    expect(scriptElement.type).toBe('script');
    expect(scriptElement.props.dangerouslySetInnerHTML?.__html).toContain('__LITE_SETTINGS__');
    expect(scriptElement.props.dangerouslySetInnerHTML?.__html).toContain(
      'kangur_storefront_default_mode'
    );
  });
});
