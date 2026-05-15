import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type NextRequest, NextResponse } from 'next/server';
import { postHandler } from './handler';
import { enqueueProductAiJob, startProductAiJobQueue } from '../../../../../jobs';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';

vi.mock('@/features/database/server/jobs', () => ({
  enqueueProductAiJob: vi.fn(),
  enqueueProductAiJobToQueue: vi.fn(),
  processProductAiJob: vi.fn(),
  startProductAiJobQueue: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: vi.fn(),
  assertDatabaseEngineOperationEnabled: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: vi.fn().mockResolvedValue({ ok: true, data: { dbType: 'mongodb' } }),
}));

describe('postHandler backup-scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers job enqueuing for targets concurrently', async () => {
    (enqueueProductAiJob as any).mockResolvedValue({ id: 'test-job-id', productId: 'p1', payload: {} });
    
    const req = {} as NextRequest;
    const ctx = {} as any;

    const response = await postHandler(req, ctx);
    const body = await response.json();

    expect(startProductAiJobQueue).toHaveBeenCalled();
    expect(enqueueProductAiJob).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.queued[0].jobId).toBe('test-job-id');
  });
});
