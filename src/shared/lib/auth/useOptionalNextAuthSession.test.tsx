/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type SessionContextValue = {
  data: { user?: { email?: string } } | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
  update: () => Promise<null>;
};

const importHook = async () =>
  import('@/shared/lib/auth/useOptionalNextAuthSession').then(
    (module) => module.useOptionalNextAuthSession
  );

afterEach(() => {
  vi.resetModules();
  vi.unmock('next-auth/react');
});

describe('useOptionalNextAuthSession', () => {
  it('prefers SessionContext when it is available', async () => {
    const useSessionMock = vi.fn(() => ({
      data: null,
      status: 'unauthenticated' as const,
      update: async () => null,
    }));
    const SessionContext = React.createContext<SessionContextValue | null>(null);

    vi.doMock('next-auth/react', () => ({
      SessionContext,
      useSession: useSessionMock,
    }));

    const useOptionalNextAuthSession = await importHook();
    const providedValue: SessionContextValue = {
      data: { user: { email: 'owner@example.com' } },
      status: 'authenticated',
      update: async () => null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionContext.Provider value={providedValue}>{children}</SessionContext.Provider>
    );

    const { result } = renderHook(() => useOptionalNextAuthSession(), { wrapper });

    expect(result.current).toBe(providedValue);
    expect(useSessionMock).not.toHaveBeenCalled();
  });

  it('falls back to useSession when SessionContext is unavailable', async () => {
    const sessionValue: SessionContextValue = {
      data: { user: { email: 'learner@example.com' } },
      status: 'authenticated',
      update: async () => null,
    };
    const useSessionMock = vi.fn(() => sessionValue);

    vi.doMock('next-auth/react', () => ({
      useSession: useSessionMock,
    }));

    const useOptionalNextAuthSession = await importHook();
    const { result } = renderHook(() => useOptionalNextAuthSession());

    expect(result.current).toBe(sessionValue);
    expect(useSessionMock).toHaveBeenCalledTimes(1);
  });

  it('returns an unauthenticated fallback when next-auth hooks are unavailable', async () => {
    vi.doMock('next-auth/react', () => ({}));

    const useOptionalNextAuthSession = await importHook();
    const { result } = renderHook(() => useOptionalNextAuthSession());

    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
    await expect(result.current.update()).resolves.toBeNull();
  });
});
