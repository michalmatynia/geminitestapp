import { describe, expect, it, vi } from 'vitest';

import {
  buildProductAiJobEnqueueCreatedEvent,
  buildProductAiJobEnqueueErrorContext,
  buildProductAiJobEnqueueReceivedEvent,
  buildProductAiJobEnqueueResponse,
  buildProductAiJobEnqueueReturnEvent,
  resolveProductAiJobEnqueueMode,
  startInlineProductAiJobProcessing,
} from './handler.helpers';

describe('product ai-jobs enqueue handler helpers', () => {
  it('resolves inline vs queued mode from env', () => {
    expect(resolveProductAiJobEnqueueMode({ NODE_ENV: 'test' })).toBe('inline');
    expect(resolveProductAiJobEnqueueMode({ NODE_ENV: 'production' })).toBe('queued');
    expect(resolveProductAiJobEnqueueMode({ NODE_ENV: 'production', AI_JOBS_INLINE: 'true' })).toBe(
      'inline'
    );
  });

  it('builds the enqueue log events, error context, and response', () => {
    expect(buildProductAiJobEnqueueReceivedEvent('product-1', 'graph_model')).toEqual({
      level: 'info',
      message: '[api/products/ai-jobs/enqueue] Received request',
      context: { productId: 'product-1', type: 'graph_model' },
    });
    expect(buildProductAiJobEnqueueCreatedEvent('job-1')).toEqual({
      level: 'info',
      message: '[api/products/ai-jobs/enqueue] Job job-1 created',
      context: { jobId: 'job-1' },
    });
    expect(buildProductAiJobEnqueueReturnEvent()).toEqual({
      level: 'info',
      message: '[api/products/ai-jobs/enqueue] Returning response to client',
    });
    expect(buildProductAiJobEnqueueErrorContext('job-1', 'product-1')).toEqual({
      service: 'api/products/ai-jobs/enqueue',
      jobId: 'job-1',
      productId: 'product-1',
    });
    expect(buildProductAiJobEnqueueResponse('job-1')).toEqual({
      success: true,
      jobId: 'job-1',
    });
  });

  it('starts inline processing and captures background failures', async () => {
    const logSystemEvent = vi.fn().mockResolvedValue(undefined);
    const processProductAiJob = vi.fn().mockRejectedValue(new Error('boom'));
    const captureException = vi.fn();

    await startInlineProductAiJobProcessing({
      jobId: 'job-1',
      productId: 'product-1',
      logSystemEvent,
      processProductAiJob,
      captureException,
    });

    expect(logSystemEvent).toHaveBeenCalledWith({
      level: 'info',
      message: '[api/products/ai-jobs/enqueue] About to call processProductAiJob for job job-1',
      context: { jobId: 'job-1' },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(processProductAiJob).toHaveBeenCalledWith('job-1');
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      service: 'api/products/ai-jobs/enqueue',
      jobId: 'job-1',
      productId: 'product-1',
    });
  });
});
