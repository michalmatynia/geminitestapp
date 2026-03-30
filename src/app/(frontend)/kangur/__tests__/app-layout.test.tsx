/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { headersMock, getKangurAuthBootstrapScriptMock, safeHtmlMock } = vi.hoisted(() => ({
  headersMock: vi.fn(async () => new Headers([['x-test', 'kangur']])),
  getKangurAuthBootstrapScriptMock: vi.fn(async () => 'window.__KANGUR_AUTH_BOOTSTRAP__=null;'),
  safeHtmlMock: vi.fn((value: string) => value),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/features/kangur/server/auth-bootstrap', () => ({
  getKangurAuthBootstrapScript: getKangurAuthBootstrapScriptMock,
}));

vi.mock('@/shared/lib/security/safe-html', () => ({
  safeHtml: safeHtmlMock,
}));

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: () => <div data-testid='kangur-server-shell' />,
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShellClientBoundary', () => ({
  KangurFeatureRouteShellClientBoundary: () => <div data-testid='kangur-route-shell-boundary' />,
}));

describe('kangur app layout', () => {
  it('renders the shared server shell once and keeps route children lightweight', async () => {
    const { default: KangurAppLayout } = await import('@/app/(frontend)/kangur/(app)/layout');

    render(
      await KangurAppLayout({
        children: <div data-testid='kangur-route-child' />,
      })
    );

    expect(headersMock).toHaveBeenCalledTimes(1);
    expect(getKangurAuthBootstrapScriptMock).toHaveBeenCalledWith(expect.any(Headers));
    expect(safeHtmlMock).toHaveBeenCalledWith('window.__KANGUR_AUTH_BOOTSTRAP__=null;');
    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-child')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-shell-boundary')).toBeInTheDocument();
    expect(
      document.querySelector('script')?.innerHTML
    ).toContain('window.__KANGUR_AUTH_BOOTSTRAP__=null;');
  });

  it('uses the same shared layout body for localized kangur routes', async () => {
    const { default: LocalizedKangurAppLayout } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/layout'
    );

    render(
      await LocalizedKangurAppLayout({
        children: <div data-testid='localized-kangur-route-child' />,
      })
    );

    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(screen.getByTestId('localized-kangur-route-child')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-shell-boundary')).toBeInTheDocument();
  });

  it('skips the inline bootstrap script when no Kangur auth bootstrap is available', async () => {
    getKangurAuthBootstrapScriptMock.mockResolvedValueOnce(null);

    const { default: KangurAppLayout } = await import('@/app/(frontend)/kangur/(app)/layout');

    render(
      await KangurAppLayout({
        children: <div data-testid='kangur-route-child' />,
      })
    );

    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-child')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-shell-boundary')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
