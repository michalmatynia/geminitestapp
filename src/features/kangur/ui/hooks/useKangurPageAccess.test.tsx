/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

import { useKangurPageAccess } from '@/features/kangur/ui/hooks/useKangurPageAccess';

function HookProbe({
  pageKey,
}: {
  pageKey: string;
}): React.JSX.Element {
  const { canAccess, status } = useKangurPageAccess(pageKey);

  return (
    <div
      data-can-access={String(canAccess)}
      data-status={status}
      data-testid='kangur-page-access-probe'
    />
  );
}

describe('useKangurPageAccess', () => {
  beforeEach(() => {
    sessionMock.mockReset();
  });

  it('allows super admins to access GamesLibrary', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'owner@example.com',
          id: 'owner-1',
          name: 'Owner',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(<HookProbe pageKey='GamesLibrary' />);

    expect(screen.getByTestId('kangur-page-access-probe')).toHaveAttribute(
      'data-can-access',
      'true'
    );
    expect(screen.getByTestId('kangur-page-access-probe')).toHaveAttribute(
      'data-status',
      'authenticated'
    );
  });

  it('blocks non-super-admin users from GamesLibrary', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          name: 'Admin',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<HookProbe pageKey='GamesLibrary' />);

    expect(screen.getByTestId('kangur-page-access-probe')).toHaveAttribute(
      'data-can-access',
      'false'
    );
  });

  it('allows public Kangur pages for anonymous users', () => {
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<HookProbe pageKey='Game' />);

    expect(screen.getByTestId('kangur-page-access-probe')).toHaveAttribute(
      'data-can-access',
      'true'
    );
    expect(screen.getByTestId('kangur-page-access-probe')).toHaveAttribute(
      'data-status',
      'unauthenticated'
    );
  });
});
