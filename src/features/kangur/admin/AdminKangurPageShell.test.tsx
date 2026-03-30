import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

const kangurRoutingProviderMock = vi.fn();

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  KangurRoutingProvider: ({
    children,
    ...props
  }: {
    pageKey?: string | null;
    requestedPath?: string;
    requestedHref?: string;
    basePath: string;
    embedded: boolean;
    children: ReactNode;
  }) => {
    kangurRoutingProviderMock(props);
    return <div data-testid='kangur-routing-provider'>{children}</div>;
  },
}));

vi.mock('@/features/kangur/admin/KangurAdminMenuToggle', () => ({
  KangurAdminMenuToggle: () => <div data-testid='kangur-admin-menu-toggle' />,
}));

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePageShell: () => <div data-testid='admin-kangur-feature-shell' />,
}));

import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';

describe('AdminKangurPageShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('passes blocked GamesLibrary routes through to shared routing for provider-level sanitization', async () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<AdminKangurPageShell slug={['games']} />);

    expect(screen.getByTestId('kangur-admin-menu-toggle')).toBeInTheDocument();
    expect(await screen.findByTestId('admin-kangur-feature-shell')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'GamesLibrary',
      requestedPath: '/admin/kangur/games',
      requestedHref: '/admin/kangur/games',
      basePath: '/admin/kangur',
      embedded: true,
    });
  });

  it('keeps GamesLibrary routes for exact super admins', async () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'owner@example.com',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(<AdminKangurPageShell slug={['games']} />);

    expect(await screen.findByTestId('admin-kangur-feature-shell')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'GamesLibrary',
      requestedPath: '/admin/kangur/games',
      requestedHref: '/admin/kangur/games',
      basePath: '/admin/kangur',
      embedded: true,
    });
  });
});
