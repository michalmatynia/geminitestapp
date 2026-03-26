/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
}));

import { useKangurAccessiblePageKey } from '@/features/kangur/ui/hooks/useKangurAccessiblePageKey';

describe('useKangurAccessiblePageKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('keeps normal Kangur pages unchanged', () => {
    const { result } = renderHook(() => useKangurAccessiblePageKey('Lessons', 'Game'));

    expect(result.current).toBe('Lessons');
  });

  it('downgrades GamesLibrary for non-super-admin sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useKangurAccessiblePageKey('GamesLibrary', 'Game'));

    expect(result.current).toBe('Game');
  });

  it('keeps GamesLibrary for exact super-admin sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'super@example.com',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useKangurAccessiblePageKey('GamesLibrary', 'Game'));

    expect(result.current).toBe('GamesLibrary');
  });
});
