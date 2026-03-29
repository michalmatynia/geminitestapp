import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiPostMock, apiPatchMock, apiDeleteMock, resolveApiUrlMock } = vi.hoisted(
  () => ({
    apiFetchMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiPatchMock: vi.fn(),
    apiDeleteMock: vi.fn(),
    resolveApiUrlMock: vi.fn(),
  })
);

vi.mock('@/shared/lib/ai-paths/api/client/base', () => ({
  apiFetch: apiFetchMock,
  apiPost: apiPostMock,
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
  resolveApiUrl: resolveApiUrlMock,
  withApiCsrfHeaders: vi.fn(),
}));

import {
  enqueueAiPathRun,
  extractAiPathRunIdFromEnqueueResponseData,
  listAiPathRuns,
} from '@/shared/lib/ai-paths/api/client';

const enqueuePayload = {
  pathId: 'path-contract-test',
  nodes: [],
  edges: [],
};

describe('enqueueAiPathRun response contract boundary', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
    resolveApiUrlMock.mockReset();
  });

  it('accepts canonical enqueue responses', async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          id: 'run-client-contract-1',
          status: 'queued',
        },
        runId: 'run-client-contract-1',
      },
    });

    const response = await enqueueAiPathRun(enqueuePayload);

    expect(response).toEqual({
      ok: true,
      data: {
        run: {
          id: 'run-client-contract-1',
          status: 'queued',
        },
        runId: 'run-client-contract-1',
      },
    });
  });

  it('accepts legacy-compatible enqueue responses exposing run._id only', async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          _id: 'run-client-contract-legacy',
          status: 'queued',
        },
      },
    });

    const response = await enqueueAiPathRun(enqueuePayload);

    expect(response).toEqual({
      ok: true,
      data: {
        run: {
          _id: 'run-client-contract-legacy',
          status: 'queued',
        },
      },
    });
  });

  it('rejects malformed enqueue responses before run-id parsing', async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          status: 'queued',
        },
      },
    });

    const response = await enqueueAiPathRun(enqueuePayload);

    expect(response).toEqual({
      ok: false,
      error: 'invalid run identifier from API.',
    });
  });

  it('rejects wrapper id/pathId payloads that are not run identifiers', async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'path_wrapper_id',
        pathId: 'path_wrapper_id',
        run: {
          status: 'queued',
        },
      },
    });

    const response = await enqueueAiPathRun(enqueuePayload);

    expect(response).toEqual({
      ok: false,
      error: 'invalid run identifier from API.',
    });
  });

  it('passes through transport failures', async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: false,
      error: 'Request failed with status 500',
    });

    const response = await enqueueAiPathRun(enqueuePayload);

    expect(response).toEqual({
      ok: false,
      error: 'Request failed with status 500',
    });
  });

  it('includes requestId in runs list queries', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      data: {
        runs: [],
        total: 0,
      },
    });

    await listAiPathRuns({
      pathId: 'path-contract-test',
      requestId: 'trigger:path-contract-test:req-1',
      includeTotal: false,
      fresh: true,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/ai-paths/runs?pathId=path-contract-test&requestId=trigger%3Apath-contract-test%3Areq-1&includeTotal=0&fresh=1',
      {}
    );
  });

  it('extracts legacy wrapper run ids before non-run wrapper ids', () => {
    expect(
      extractAiPathRunIdFromEnqueueResponseData({
        data: {
          id: 'not-a-run-id',
          runId: 'run-client-contract-wrapper',
          run: {
            status: 'queued',
          },
        },
      })
    ).toBe('run-client-contract-wrapper');
  });

  it('includes optional list filters when provided', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      data: {
        runs: [],
        total: 0,
      },
    });

    await listAiPathRuns({
      nodeId: 'node-1',
      source: 'dashboard',
      sourceMode: 'exclude',
      visibility: 'global',
      status: 'running',
      query: 'trace',
      limit: 25,
      offset: 50,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/ai-paths/runs?nodeId=node-1&source=dashboard&sourceMode=exclude&visibility=global&status=running&query=trace&limit=25&offset=50',
      {}
    );
  });
});
