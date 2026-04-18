/**
 * @vitest-environment jsdom
 */

import { Children } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const { queryProviderMock, kangurLoadingFallbackMock } = vi.hoisted(() => ({
  queryProviderMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  kangurLoadingFallbackMock: vi.fn(() => <div data-testid='kangur-loading-fallback' />),
}));

vi.mock('../providers/QueryProvider', () => ({
  StudiqQueryProvider: queryProviderMock,
}));

vi.mock('../components/KangurLoadingFallback', () => ({
  default: kangurLoadingFallbackMock,
}));

describe('apps/studiq-web RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the root shell structural and leaves locale ownership to nested Kangur layouts', async () => {
    const { default: RootLayout } = await import('./layout');

    const layout = await RootLayout({
      children: <div data-testid='child'>child</div>,
    });
    const htmlElement = layout as ReactElement<{ children?: ReactNode; lang?: string }>;
    const bodyElement = htmlElement.props.children as ReactElement<{ children?: ReactNode }>;
    const suspenseElement = Children.only(bodyElement.props.children) as ReactElement<{
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
});
