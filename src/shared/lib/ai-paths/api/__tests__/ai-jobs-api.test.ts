import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiPostMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client/base', () => ({
  apiFetch: apiFetchMock,
  apiPost: apiPostMock,
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  resolveApiUrl: vi.fn(),
  withApiCsrfHeaders: vi.fn(),
}));

import { aiJobsApi } from '@/shared/lib/ai-paths/api/client';

describe('aiJobsApi', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiPostMock.mockReset();
  });

  it('uses v2 product ai-jobs endpoints', async () => {
    apiPostMock.mockResolvedValueOnce({ ok: true, data: { jobId: 'job-1' } });
    apiFetchMock.mockResolvedValue({ ok: true, data: { jobs: [] } });

    await aiJobsApi.enqueue({ productId: 'p-1', type: 'graph_model', payload: { prompt: 'x' } });
    await aiJobsApi.get('job-1');
    await aiJobsApi.list();

    expect(apiPostMock).toHaveBeenCalledWith('/api/v2/products/ai-jobs/enqueue', {
      productId: 'p-1',
      type: 'graph_model',
      payload: { prompt: 'x' },
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/api/v2/products/ai-jobs/job-1');
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/api/v2/products/ai-jobs');
  });

  it('maps v2 job payloads to poll contract and normalizes cancelled status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      data: {
        job: {
          status: 'cancelled',
          result: { result: 'done' },
          errorMessage: 'Canceled by user',
        },
      },
    });

    const response = await aiJobsApi.poll('job-2');

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v2/products/ai-jobs/job-2', undefined);
    expect(response).toEqual({
      ok: true,
      data: {
        status: 'canceled',
        result: { result: 'done' },
        error: 'Canceled by user',
      },
    });
  });

  it('keeps legacy poll payload shape compatible', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      data: {
        status: 'completed',
        result: { result: 'text' },
      },
    });

    const response = await aiJobsApi.poll('job-3');

    expect(response).toEqual({
      ok: true,
      data: {
        status: 'completed',
        result: { result: 'text' },
      },
    });
  });

  it('passes through poll transport errors', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      error: 'Request failed with status 404',
    });

    const response = await aiJobsApi.poll('job-4');

    expect(response).toEqual({
      ok: false,
      error: 'Request failed with status 404',
    });
  });
});
