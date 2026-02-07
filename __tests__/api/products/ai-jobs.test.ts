import { NextRequest, NextResponse } from 'next/server';
import { vi, beforeEach } from 'vitest';
import { describe, it, expect } from 'vitest';

import { POST as POST_ENQUEUE } from '@/app/api/products/ai-jobs/enqueue/route';
import { GET } from '@/app/api/products/ai-jobs/route';

// Mock the api-handler module
vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: (handler: any) => async (req: any) => {
    try {
      const body = req.body ? await req.json().catch(() => ({})) : {};
      return await handler(req, { requestId: 'test', body });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus || 500 });
    }
  },
  apiHandlerWithParams: (handler: any) => async (req: any, ctx: any) => {
    try {
      const body = req.body ? await req.json().catch(() => ({})) : {};
      const context = { ...ctx, requestId: 'test', body };
      const resolvedParams = ctx?.params && typeof ctx.params.then === 'function' ? await ctx.params : (ctx?.params ?? {});
      return await handler(req, context, resolvedParams);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus || 500 });
    }
  },
}));

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
  processSingleJob: vi.fn().mockResolvedValue(undefined),
}));

// Mock products server
vi.mock('@/features/products/server', () => ({
  parseJsonBody: async (req: any) => {
    try {
      const body = await req.json();
      return { ok: true, data: body };
    } catch {
      return { ok: false, response: new Response('Invalid JSON', { status: 400 }) };
    }
  },
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
      const payload = { productId: 'prod1', type: 'description', config: {} };
      const res = await POST_ENQUEUE(
        new NextRequest('http://localhost/api/products/ai-jobs/enqueue', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toEqual(200);
    });
  });
});