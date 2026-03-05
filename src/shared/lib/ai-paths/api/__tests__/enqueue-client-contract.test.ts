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

import { enqueueAiPathRun } from '@/shared/lib/ai-paths/api/client';

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
});
