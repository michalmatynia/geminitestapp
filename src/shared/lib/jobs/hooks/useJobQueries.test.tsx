import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useBaseImportRuns,
  useBaseImportQueueHealth,
  jobKeys,
  useChatbotJobs,
  useIntegrationJobs,
  useTraderaQueueHealth,
} from '@/shared/lib/jobs/hooks/useJobQueries';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const createSingleQueryV2Mock = vi.hoisted(() => vi.fn());
const getIntegrationJobsMock = vi.hoisted(() => vi.fn());
const getChatbotJobsMock = vi.hoisted(() => vi.fn());
const getBaseImportRunsMock = vi.hoisted(() => vi.fn());
const getBaseImportQueueHealthMock = vi.hoisted(() => vi.fn());
const getTraderaQueueHealthMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
  createSingleQueryV2: createSingleQueryV2Mock,
}));

vi.mock('@/shared/lib/jobs/api', () => ({
  getBaseImportRuns: getBaseImportRunsMock,
  getBaseImportQueueHealth: getBaseImportQueueHealthMock,
  getIntegrationJobs: getIntegrationJobsMock,
  getChatbotJobs: getChatbotJobsMock,
  getTraderaQueueHealth: getTraderaQueueHealthMock,
}));

describe('useJobQueries', () => {
  beforeEach(() => {
    createListQueryV2Mock.mockReset();
    createSingleQueryV2Mock.mockReset();
    getIntegrationJobsMock.mockReset();
    getChatbotJobsMock.mockReset();
    getBaseImportRunsMock.mockReset();
    getBaseImportQueueHealthMock.mockReset();
    getTraderaQueueHealthMock.mockReset();

    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    createSingleQueryV2Mock.mockReturnValue({ kind: 'single-query' });
    getIntegrationJobsMock.mockResolvedValue([{ id: 'listing-job-1' }]);
    getChatbotJobsMock.mockResolvedValue({ jobs: [] });
    getBaseImportRunsMock.mockResolvedValue([{ id: 'run-1', status: 'queued' }]);
    getBaseImportQueueHealthMock.mockResolvedValue({ ok: true });
    getTraderaQueueHealthMock.mockResolvedValue({ ok: true });
  });

  it('configures the integration jobs query and active-listing polling policy', async () => {
    const { result } = renderHook(() => useIntegrationJobs());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];
    const signal = new AbortController().signal;

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual(jobKeys.integrations());
    expect(config.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useIntegrationJobs',
        operation: 'list',
        resource: 'jobs.integrations',
        queryKey: jobKeys.integrations(),
      })
    );

    await expect(config.queryFn({ signal })).resolves.toEqual([{ id: 'listing-job-1' }]);
    expect(getIntegrationJobsMock).toHaveBeenCalledWith(signal);
    expect(config.refetchInterval({ state: { data: undefined } })).toBe(5000);
    expect(
      config.refetchInterval({
        state: {
          data: [
            {
              listings: [{ status: 'queued' }],
            },
          ],
        },
      })
    ).toBe(2500);
    expect(
      config.refetchInterval({
        state: {
          data: [
            {
              listings: [{ status: 'completed' }],
            },
          ],
        },
      })
    ).toBe(false);

    const knownError = new Error('known');
    expect(config.transformError(knownError)).toBe(knownError);
    expect(config.transformError('boom').message).toBe(
      'Failed to load integration jobs. Please try again.'
    );
  });

  it('configures chatbot and queue-health queries with the expected keys and fetchers', async () => {
    const chatbotHook = renderHook(() => useChatbotJobs('failed'));
    const chatbotConfig = createSingleQueryV2Mock.mock.calls[0]?.[0];

    expect(chatbotHook.result.current).toEqual({ kind: 'single-query' });
    expect(chatbotConfig.id).toBe('failed');
    expect(chatbotConfig.queryKey).toEqual(jobKeys.chatbot('failed'));
    expect(chatbotConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useChatbotJobs',
        resource: 'jobs.chatbot',
      })
    );
    await expect(chatbotConfig.queryFn()).resolves.toEqual({ jobs: [] });
    expect(getChatbotJobsMock).toHaveBeenCalledWith('failed');

    const baseImportRunsHook = renderHook(() => useBaseImportRuns(100));
    const baseImportRunsConfig = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(baseImportRunsHook.result.current).toEqual({ kind: 'list-query' });
    expect(baseImportRunsConfig.queryKey).toEqual(jobKeys.baseImportRuns(100));
    expect(baseImportRunsConfig.staleTime).toBe(0);
    expect(baseImportRunsConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useBaseImportRuns',
        resource: 'jobs.base-import-runs',
      })
    );
    await expect(baseImportRunsConfig.queryFn({ signal: undefined })).resolves.toEqual([
      { id: 'run-1', status: 'queued' },
    ]);
    expect(getBaseImportRunsMock).toHaveBeenCalledWith(100, undefined);
    expect(baseImportRunsConfig.refetchInterval({ state: { data: undefined } })).toBe(5000);
    expect(
      baseImportRunsConfig.refetchInterval({
        state: { data: [{ id: 'run-2', status: 'queued' }] },
      })
    ).toBe(2500);
    expect(
      baseImportRunsConfig.refetchInterval({
        state: { data: [{ id: 'run-3', status: 'completed' }] },
      })
    ).toBe(5000);

    const baseImportHook = renderHook(() => useBaseImportQueueHealth());
    const baseImportConfig = createSingleQueryV2Mock.mock.calls[1]?.[0];

    expect(baseImportHook.result.current).toEqual({ kind: 'single-query' });
    expect(baseImportConfig.id).toBe('base-import-health');
    expect(baseImportConfig.queryKey).toEqual(jobKeys.baseImportQueueHealth());
    expect(baseImportConfig.refetchInterval).toBe(5000);
    expect(baseImportConfig.staleTime).toBe(0);
    expect(baseImportConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useBaseImportQueueHealth',
        resource: 'jobs.base-import-health',
      })
    );
    await expect(baseImportConfig.queryFn()).resolves.toEqual({ ok: true });
    expect(getBaseImportQueueHealthMock).toHaveBeenCalledTimes(1);

    const traderaHook = renderHook(() => useTraderaQueueHealth());
    const traderaConfig = createSingleQueryV2Mock.mock.calls[2]?.[0];

    expect(traderaHook.result.current).toEqual({ kind: 'single-query' });
    expect(traderaConfig.id).toBe('tradera-health');
    expect(traderaConfig.queryKey).toEqual(jobKeys.traderaQueueHealth());
    expect(traderaConfig.refetchInterval).toBe(5000);
    expect(traderaConfig.staleTime).toBe(0);
    expect(traderaConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useTraderaQueueHealth',
        resource: 'jobs.tradera-health',
      })
    );
    await expect(traderaConfig.queryFn()).resolves.toEqual({ ok: true });
    expect(getTraderaQueueHealthMock).toHaveBeenCalledTimes(1);
  });
});
