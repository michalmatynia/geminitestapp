import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueueProductAiJobMock,
  startProductAiJobQueueMock,
  getProductRepositoryMock,
} = vi.hoisted(() => ({
  enqueueProductAiJobMock: vi.fn(),
  startProductAiJobQueueMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueProductAiJob: enqueueProductAiJobMock,
  startProductAiJobQueue: startProductAiJobQueueMock,
}));

vi.mock('@/features/products/server', async () => {
  const actual = await vi.importActual<typeof import('@/features/products/server')>(
    '@/features/products/server'
  );
  return {
    ...actual,
    getProductRepository: getProductRepositoryMock,
  };
});

import { POST_handler } from './handler';

const makeRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/v2/products/ai-jobs/bulk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

describe('products ai jobs bulk graph_model payload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductRepositoryMock.mockResolvedValue({
      getProducts: vi.fn().mockResolvedValue([
        { id: 'product-1' },
        { id: 'product-2' },
      ]),
    });
    enqueueProductAiJobMock.mockResolvedValue({ id: 'job-1' });
  });

  it('preserves graph.requestedModelId for bulk graph_model jobs', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            requestedModelId: 'gpt-4o-mini',
            nodeId: 'model-node-1',
            runId: 'run-1',
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(200);
    expect(enqueueProductAiJobMock).toHaveBeenCalledTimes(2);
    expect(enqueueProductAiJobMock).toHaveBeenNthCalledWith(
      1,
      'product-1',
      'graph_model',
      expect.objectContaining({
        graph: expect.objectContaining({
          requestedModelId: 'gpt-4o-mini',
        }),
      })
    );
  });

  it('rejects invalid graph_model config payload shapes', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: 'Generate copy',
          graph: {
            requestedModelId: 7,
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });

  it('rejects graph_model bulk requests without source', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: 'Generate copy',
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });

  it('rejects graph_model bulk requests without config', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });

  it('rejects graph_model bulk requests with a blank prompt', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: '   ',
          source: 'ai_paths',
          graph: {
            nodeId: 'model-node-1',
            runId: 'run-1',
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });

  it('rejects ai_paths graph_model bulk requests without graph node context', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: 'Generate copy',
          source: 'ai_paths',
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });

  it('rejects ai_paths graph_model bulk requests without graph.nodeId even when source is explicit', async () => {
    const response = await POST_handler(
      makeRequest({
        type: 'graph_model',
        config: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });
});
