import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueueProductAiJobMock,
  processProductAiJobMock,
  startProductAiJobQueueMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  enqueueProductAiJobMock: vi.fn(),
  processProductAiJobMock: vi.fn(),
  startProductAiJobQueueMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueProductAiJob: enqueueProductAiJobMock,
  processProductAiJob: processProductAiJobMock,
  startProductAiJobQueue: startProductAiJobQueueMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/v2/products/ai-jobs/enqueue', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

describe('products ai jobs enqueue graph_model payload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueProductAiJobMock.mockResolvedValue({
      id: 'job-1',
    });
    processProductAiJobMock.mockResolvedValue(undefined);
    logSystemEventMock.mockResolvedValue(undefined);
  });

  it('preserves graph.requestedModelId for graph_model payloads', async () => {
    const response = await POST_handler(
      makeRequest({
        productId: 'product-1',
        type: 'graph_model',
        payload: {
          prompt: 'Generate copy',
          graph: {
            runId: 'run-1',
            nodeId: 'model-node-1',
            requestedModelId: 'gpt-4o-mini',
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(200);
    expect(enqueueProductAiJobMock).toHaveBeenCalledWith(
      'product-1',
      'graph_model',
      expect.objectContaining({
        graph: expect.objectContaining({
          requestedModelId: 'gpt-4o-mini',
        }),
      })
    );
  });

  it('rejects invalid graph_model graph payload shapes', async () => {
    const response = await POST_handler(
      makeRequest({
        productId: 'product-1',
        type: 'graph_model',
        payload: {
          prompt: 'Generate copy',
          graph: {
            requestedModelId: 42,
          },
        },
      }),
      {} as never
    );

    expect(response.status).toBe(400);
    expect(enqueueProductAiJobMock).not.toHaveBeenCalled();
  });
});
