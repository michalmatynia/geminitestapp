/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

const mocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mocks.apiGetMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mocks.logClientErrorMock(...args),
}));

import { useAiPathsTriggerButtonsQuery } from './useAiPathQueries';

const createWrapper = (): ((props: PropsWithChildren) => ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: PropsWithChildren): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useAiPathsTriggerButtonsQuery', () => {
  beforeEach(() => {
    mocks.apiGetMock.mockReset();
    mocks.logClientErrorMock.mockReset();
  });

  it('fails closed to an empty trigger-button list when the API request errors', async () => {
    const networkError = new Error('Network Error');
    mocks.apiGetMock.mockRejectedValue(networkError);

    const { result } = renderHook(() => useAiPathsTriggerButtonsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mocks.apiGetMock).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons', {
      logError: false,
    });
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(mocks.logClientErrorMock).toHaveBeenCalledWith(networkError, {
      context: {
        source: 'aiPaths.hooks.useAiPathsTriggerButtonsQuery',
        action: 'loadTriggerButtons',
        endpoint: '/api/ai-paths/trigger-buttons',
      },
    });
  });

  it('returns trigger buttons unchanged when the API request succeeds', async () => {
    const buttons: AiTriggerButtonRecord[] = [
      {
        id: 'button-product-row',
        name: 'BLWo',
        iconId: null,
        locations: ['product_row'],
        mode: 'click',
        display: {
          label: 'BLWo',
        },
        pathId: 'path_base_export_blwo_v1',
        enabled: true,
        sortIndex: 0,
        createdAt: '2026-03-11T10:00:00.000Z',
        updatedAt: '2026-03-11T10:00:00.000Z',
      },
    ];
    mocks.apiGetMock.mockResolvedValue(buttons);

    const { result } = renderHook(() => useAiPathsTriggerButtonsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(buttons);
    });

    expect(mocks.logClientErrorMock).not.toHaveBeenCalled();
  });
});
