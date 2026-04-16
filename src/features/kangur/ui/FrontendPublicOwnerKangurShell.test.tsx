/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock, kangurFeatureRouteShellMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  kangurFeatureRouteShellMock: vi.fn(),
}));
const { kangurStorefrontAppearanceProviderMock } = vi.hoisted(() => ({
  kangurStorefrontAppearanceProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-storefront-appearance-provider'>{children}</div>
  )),
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='kangur-vercel-analytics' />,
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('nextjs-toploader/app', () => ({
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
  KangurStorefrontAppearanceProvider: kangurStorefrontAppearanceProviderMock,
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

describe('FrontendPublicOwnerKangurShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    usePathnameMock.mockReturnValue('/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not mount vercel analytics by default for the standalone root-owned kangur shell', async () => {
    const { FrontendPublicOwnerKangurShell } = await import(
      '@/features/kangur/ui/FrontendPublicOwnerKangurShell'
    );

    render(<FrontendPublicOwnerKangurShell />);

    expect(screen.getByTestId('kangur-storefront-appearance-provider')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-surface-class-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-main-role-provider')).toHaveAttribute(
      'data-suppress-main-role',
      'true'
    );
    expect(screen.queryByTestId('kangur-vercel-analytics')).not.toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: true,
      forceBodyScrollLock: false,
    });
  });

  it('keeps analytics disabled by default on non-embedded standalone kangur routes', async () => {
    window.history.replaceState({}, '', '/en/lessons');
    usePathnameMock.mockReturnValue('/en/lessons');

    const { FrontendPublicOwnerKangurShell } = await import(
      '@/features/kangur/ui/FrontendPublicOwnerKangurShell'
    );

    render(<FrontendPublicOwnerKangurShell />);

    expect(screen.queryByTestId('kangur-vercel-analytics')).not.toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: false,
      forceBodyScrollLock: false,
    });
  });

  it('mounts analytics when explicitly enabled for the standalone shell', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS', 'true');

    const { FrontendPublicOwnerKangurShell } = await import(
      '@/features/kangur/ui/FrontendPublicOwnerKangurShell'
    );

    render(<FrontendPublicOwnerKangurShell />);

    expect(screen.getAllByTestId('kangur-vercel-analytics')).toHaveLength(1);
  });

  it('forwards the initial Mongo-backed appearance snapshot into the appearance provider', async () => {
    const { FrontendPublicOwnerKangurShell } = await import(
      '@/features/kangur/ui/FrontendPublicOwnerKangurShell'
    );

    render(
      <FrontendPublicOwnerKangurShell
        initialAppearance={{
          mode: 'sunset',
          themeSettings: {
            sunset: '{"backgroundColor":"#ff8800"}',
          },
        }}
      />
    );

    expect(kangurStorefrontAppearanceProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialAppearance: {
          mode: 'sunset',
          themeSettings: {
            sunset: '{"backgroundColor":"#ff8800"}',
          },
        },
      }),
      undefined
    );
  });
});
