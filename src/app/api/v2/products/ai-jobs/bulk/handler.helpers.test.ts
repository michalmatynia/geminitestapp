import { describe, expect, it } from 'vitest';

import {
  buildBulkProductAiJobEmptyResponse,
  buildBulkProductAiJobPayload,
  buildBulkProductAiJobQueuedResponse,
  BULK_PRODUCT_AI_JOB_LIST_QUERY,
} from './handler.helpers';

describe('product ai-jobs bulk handler helpers', () => {
  it('exposes the fixed bulk product list query', () => {
    expect(BULK_PRODUCT_AI_JOB_LIST_QUERY).toEqual({
      pageSize: 10000,
      page: 1,
    });
  });

  it('clones defined config payloads and falls back to an empty object', () => {
    const config = {
      prompt: 'Generate copy',
      graph: {
        nodeId: 'model-node-1',
      },
    };

    const payload = buildBulkProductAiJobPayload(config);

    expect(payload).toEqual(config);
    expect(payload).not.toBe(config);
    expect(buildBulkProductAiJobPayload(undefined)).toEqual({});
  });

  it('builds empty and queued bulk responses', () => {
    expect(buildBulkProductAiJobEmptyResponse()).toEqual({
      message: 'No products found to process',
      count: 0,
    });
    expect(buildBulkProductAiJobQueuedResponse('graph_model', 2)).toEqual({
      success: true,
      count: 2,
      message: 'Queued 2 jobs of type graph_model',
    });
  });
});
