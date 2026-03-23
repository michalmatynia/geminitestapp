/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsSpectateMock,
  withKangurClientErrorMock,
} = vi.hoisted(() => ({
  duelsSpectateMock: vi.fn(),
  withKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    duels: {
      spectate: duelsSpectateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: withKangurClientErrorMock,
}));

import { useDuelSpectator } from '@/features/kangur/ui/pages/duels/useDuelSpectator';

const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

describe('useDuelSpectator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withKangurClientErrorMock.mockImplementation(
      async (
        _details: unknown,
        action: () => Promise<unknown>,
        options?: {
          fallback?: unknown;
          onError?: (error: unknown) => void;
        }
      ) => {
        try {
          return await action();
        } catch (error) {
          options?.onError?.(error);
          return options?.fallback;
        }
      }
    );
  });

  it('aborts active spectator polling when the duel route becomes inactive', async () => {
    let spectatorSignal: AbortSignal | null = null;

    duelsSpectateMock.mockImplementation(
      (_sessionId: string, { signal }: { signal: AbortSignal }) => {
        spectatorSignal = signal;
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
        });
      }
    );

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useDuelSpectator>[0]) => useDuelSpectator(props),
      {
        initialProps: {
          spectateSessionId: 'spectate-1',
          isOnline: true,
          isPageActive: true,
          isInSession: false,
          resolveSpectatorId: () => 'viewer-1',
        },
      }
    );

    await waitFor(() => {
      expect(duelsSpectateMock).toHaveBeenCalledTimes(1);
      expect(result.current.isSpectatorLoading).toBe(true);
    });

    rerender({
      spectateSessionId: 'spectate-1',
      isOnline: true,
      isPageActive: false,
      isInSession: false,
      resolveSpectatorId: () => 'viewer-1',
    });

    await waitFor(() => {
      expect(spectatorSignal?.aborted).toBe(true);
      expect(result.current.isSpectatorLoading).toBe(false);
    });
  });
});
