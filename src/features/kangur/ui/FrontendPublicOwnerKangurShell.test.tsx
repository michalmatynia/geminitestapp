/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock, kangurFeatureRouteShellMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  kangurFeatureRouteShellMock: vi.fn(),
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='kangur-vercel-analytics' />,
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: (props: {
    basePath: string;
    embedded: boolean;
    forceBodyScrollLock: boolean;
  }) => {
    kangurFeatureRouteShellMock(props);
    return <div data-testid='kangur-feature-route-shell' />;
  },
}));

vi.mock('@/features/kangur/ui/KangurStorefrontAppearanceProvider', () => ({
  KangurStorefrontAppearanceProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-storefront-appearance-provider'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-class-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/design/primitives/KangurPageContainer', () => ({
  KangurMainRoleProvider: ({
    children,
    suppressMainRole,
  }: {
    children: ReactNode;
    suppressMainRole?: boolean;
  }) => (
    <div
      data-testid='kangur-main-role-provider'
      data-suppress-main-role={suppressMainRole ? 'true' : 'false'}
    >
      {children}
    </div>
  ),
}));

import { FrontendPublicOwnerKangurShell } from '@/features/kangur/ui/FrontendPublicOwnerKangurShell';

describe('FrontendPublicOwnerKangurShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    usePathnameMock.mockReturnValue('/');
  });

  it('mounts vercel analytics for the standalone root-owned kangur shell', () => {
    render(<FrontendPublicOwnerKangurShell />);

    expect(screen.getByTestId('kangur-storefront-appearance-provider')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-surface-class-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-main-role-provider')).toHaveAttribute(
      'data-suppress-main-role',
      'true'
    );
    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: true,
      forceBodyScrollLock: false,
    });
  });

  it('keeps analytics mounted on non-embedded standalone kangur routes', () => {
    window.history.replaceState({}, '', '/en/lessons');
    usePathnameMock.mockReturnValue('/en/lessons');

    render(<FrontendPublicOwnerKangurShell />);

    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: false,
      forceBodyScrollLock: false,
    });
  });
});
