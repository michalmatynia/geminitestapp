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

import { useKangurElevatedSession } from '@/features/kangur/ui/hooks/useKangurElevatedSession';

function HookProbe(): React.JSX.Element {
  const { elevatedUser, isSuperAdmin, status } = useKangurElevatedSession();

  return (
    <div
      data-email={elevatedUser?.email ?? 'none'}
      data-is-super-admin={String(isSuperAdmin)}
      data-role={elevatedUser?.role ?? 'none'}
      data-status={status}
      data-testid='kangur-elevated-session-probe'
    />
  );
}

describe('useKangurElevatedSession', () => {
  beforeEach(() => {
    sessionMock.mockReset();
  });

  it('returns the elevated snapshot for elevated sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'owner@example.com',
          id: 'owner-1',
          isElevated: true,
          name: 'Owner',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(<HookProbe />);

    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-email',
      'owner@example.com'
    );
    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-role',
      'super_admin'
    );
    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-is-super-admin',
      'true'
    );
    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-status',
      'authenticated'
    );
  });

  it('returns no elevated snapshot for regular sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'parent@example.com',
          id: 'parent-1',
          name: 'Parent',
          role: 'parent',
        },
      },
      status: 'authenticated',
    });

    render(<HookProbe />);

    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-email',
      'none'
    );
    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-role',
      'none'
    );
    expect(screen.getByTestId('kangur-elevated-session-probe')).toHaveAttribute(
      'data-is-super-admin',
      'false'
    );
  });
});
