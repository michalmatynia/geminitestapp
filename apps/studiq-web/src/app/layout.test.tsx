/**
 * @vitest-environment jsdom
 */

import { Children } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const { queryProviderMock, getLiteSettingsForHydrationMock } = vi.hoisted(() => ({
  queryProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  getLiteSettingsForHydrationMock: vi.fn(),
}));

vi.mock('../providers/QueryProvider', () => ({
  StudiqQueryProvider: queryProviderMock,
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
    const { default: RootLayout, StudiqRootContent } = await import('./layout');

    const layout = RootLayout({
      children: <div data-testid='child'>child</div>,
    });
    const htmlElement = layout as ReactElement<{ children?: ReactNode; lang?: string }>;
    const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
    const bodyChildren = Children.toArray(bodyElement.props.children) as ReactElement[];
    const suspenseElement = bodyChildren.at(-1) as ReactElement<{
      children?: ReactNode;
      fallback?: ReactNode;
    }>;
    const rootContentElement = Children.only(suspenseElement.props.children) as ReactElement<{
      children?: ReactNode;
    }>;

    expect(htmlElement.props.lang).toBe('pl');
    expect(rootContentElement.type).toBe(StudiqRootContent);
    expect(suspenseElement.props.fallback).toBeNull();
    expect(getLiteSettingsForHydrationMock).not.toHaveBeenCalled();
  });

  it('injects lite settings hydration script when SSR data is available', async () => {
    getLiteSettingsForHydrationMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode', value: 'default' },
    ]);

    const { StudiqRootContent } = await import('./layout');

    const content = await StudiqRootContent({
      children: <div data-testid='child'>child</div>,
    });
    const contentElement = content as ReactElement<{ children?: ReactNode }>;
    const contentChildren = Children.toArray(contentElement.props.children) as ReactElement[];
    const scriptElement = contentChildren[0] as ReactElement<{
      dangerouslySetInnerHTML?: { __html: string };
      id?: string;
      type?: string;
    }>;
    const queryProviderElement = contentChildren.at(-1) as ReactElement<{
      initialLiteSettings?: ReadonlyArray<{ key: string; value: string }>;
    }>;

    expect(getLiteSettingsForHydrationMock).toHaveBeenCalledTimes(1);
    expect(scriptElement.type).toBe('script');
    expect(scriptElement.props.id).toBe('__LITE_SETTINGS__');
    expect(scriptElement.props.type).toBe('application/json');
    expect(scriptElement.props.dangerouslySetInnerHTML?.__html).toContain(
      'kangur_storefront_default_mode'
    );
    expect(queryProviderElement.props.initialLiteSettings).toEqual([
      { key: 'kangur_storefront_default_mode', value: 'default' },
    ]);
  });
});
