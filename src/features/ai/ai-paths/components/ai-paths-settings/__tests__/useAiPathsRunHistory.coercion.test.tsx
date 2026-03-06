import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

const listAiPathRunsMock = vi.hoisted(() => vi.fn());
const getAiPathRunMock = vi.hoisted(() => vi.fn());
const cancelAiPathRunMock = vi.hoisted(() => vi.fn());
const resumeAiPathRunMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths')>('@/shared/lib/ai-paths');
  return {
    ...actual,
    listAiPathRuns: listAiPathRunsMock,
    getAiPathRun: getAiPathRunMock,
    cancelAiPathRun: cancelAiPathRunMock,
    resumeAiPathRun: resumeAiPathRunMock,
  };
});

import {
  RunHistoryProvider,
  useRunHistoryState,
} from '@/features/ai/ai-paths/context/RunHistoryContext';

import { useAiPathsRunHistory } from '../useAiPathsRunHistory';

const toastMock = vi.fn();

const createWrapper = (): React.ComponentType<{ children: React.ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <RunHistoryProvider>{children}</RunHistoryProvider>
      </QueryClientProvider>
    );
  };
};

const useHarness = (): ReturnType<typeof useRunHistoryState> => {
  useAiPathsRunHistory({
    activePathId: 'path-legacy',
    toast: toastMock,
  });
  return useRunHistoryState();
};

describe('useAiPathsRunHistory run coercion', () => {
  it('keeps legacy runs visible by coercing _id and cancelled status', async () => {
    listAiPathRunsMock.mockResolvedValue({
      ok: true,
      data: {
        runs: [
          {
            _id: 'run_legacy_1',
            pathId: 'path-legacy',
            pathName: 'Legacy Path',
            status: 'cancelled',
            createdAt: '2026-03-05T06:12:00.000Z',
            finishedAt: '2026-03-05T06:13:00.000Z',
          },
        ],
        total: 1,
      },
    });

    const { result } = renderHook(() => useHarness(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.runList).toHaveLength(1);
    });

    expect(result.current.runList[0]?.id).toBe('run_legacy_1');
    expect(result.current.runList[0]?.status).toBe('canceled');
    expect(listAiPathRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'path-legacy',
        limit: 100,
      })
    );
  });
});
