import { NextRequest } from 'next/server';
import { vi, beforeEach } from 'vitest';
import { describe, it, expect } from 'vitest';

import { POST as POST_BULK } from '@/app/api/v2/products/ai-jobs/bulk/route-handler';
import { POST as POST_ENQUEUE } from '@/app/api/v2/products/ai-jobs/enqueue/route-handler';
import { GET } from '@/app/api/v2/products/ai-jobs/route-handler';

const buildPostRequest = (url: string, payload: Record<string, unknown>) =>
  new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Mock jobs server
vi.mock('@/features/jobs/server', () => ({
  getProductAiJobs: vi.fn().mockResolvedValue([]),
  getProductAiJob: vi.fn().mockResolvedValue(null),
  cancelProductAiJob: vi.fn().mockResolvedValue({ id: 'job1', status: 'cancelled' }),
  deleteProductAiJob: vi.fn().mockResolvedValue(true),
  deleteTerminalProductAiJobs: vi.fn().mockResolvedValue(5),
  deleteAllProductAiJobs: vi.fn().mockResolvedValue(10),
  cleanupStaleRunningProductAiJobs: vi.fn().mockResolvedValue(0),
  startProductAiJobQueue: vi.fn(),
  getQueueStatus: vi.fn().mockReturnValue({ active: 0, waiting: 0 }),
  enqueueProductAiJob: vi.fn().mockResolvedValue({ id: 'job1' }),
  processProductAiJob: vi.fn().mockResolvedValue(undefined),
}));

// Mock products server
vi.mock('@/features/products/server', () => ({
  parseJsonBody: async (req: NextRequest, schema: { safeParse: (value: unknown) => unknown }) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body) as
        | { success: true; data: unknown }
        | { success: false };
      if (result.success) {
        return { ok: true, data: result.data };
      }
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      };
    } catch {
      return { ok: false, response: new Response('Invalid JSON', { status: 400 }) };
    }
  },
  getProductRepository: vi.fn().mockResolvedValue({
    getProducts: vi.fn().mockResolvedValue([{ id: 'prod1' }]),
  }),
}));

describe('Product AI Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/products/ai-jobs', () => {
    it('should return jobs for a given productId', async () => {
      const res = await GET(
        new NextRequest('http://localhost/api/products/ai-jobs?productId=prod1')
      );
      expect(res.status).toEqual(200);
    });
  });

  describe('POST /api/products/ai-jobs/enqueue', () => {
    it('should enqueue a new job', async () => {
      const payload = {
        productId: 'prod1',
        type: 'graph_model',
        payload: {
          prompt: 'Explain this product graph.',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        },
      };
      const res = await POST_ENQUEUE(
        buildPostRequest('http://localhost/api/products/ai-jobs/enqueue', payload)
      );
      expect(res.status).toEqual(200);
    });

    it('rejects removed description_generation jobs', async () => {
      const res = await POST_ENQUEUE(
        buildPostRequest('http://localhost/api/products/ai-jobs/enqueue', {
          productId: 'prod1',
          type: 'description_generation',
          payload: {},
        })
      );

      expect(res.status).toEqual(400);
    });

    it('rejects removed translation jobs', async () => {
      const res = await POST_ENQUEUE(
        buildPostRequest('http://localhost/api/products/ai-jobs/enqueue', {
          productId: 'prod1',
          type: 'translation',
          payload: {},
        })
      );

      expect(res.status).toEqual(400);
    });
  });

  describe('POST /api/products/ai-jobs/bulk', () => {
    it('rejects removed description_generation bulk jobs', async () => {
      const res = await POST_BULK(
        buildPostRequest('http://localhost/api/products/ai-jobs/bulk', {
          type: 'description_generation',
          config: {},
        })
      );

      expect(res.status).toEqual(400);
    });

    it('rejects removed translation bulk jobs', async () => {
      const res = await POST_BULK(
        buildPostRequest('http://localhost/api/products/ai-jobs/bulk', {
          type: 'translation',
          config: {},
        })
      );

      expect(res.status).toEqual(400);
    });
  });
});
