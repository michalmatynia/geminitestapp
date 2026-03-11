import { describe, expect, it } from 'vitest';

import {
  productAiJobActionResponseSchema,
  productAiJobEnqueueResponseSchema,
  productAiJobsClearResponseSchema,
  productAiJobsResponseSchema,
} from '@/shared/contracts/jobs';

const sampleProductAiJob = {
  id: 'job-1',
  productId: 'product-1',
  status: 'running' as const,
  type: 'graph_model',
  payload: {
    source: 'ai_paths',
  },
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:01:00.000Z',
};

describe('jobs contract runtime', () => {
  it('parses product ai job response envelopes', () => {
    expect(
      productAiJobsResponseSchema.parse({
        jobs: [sampleProductAiJob],
      }).jobs
    ).toHaveLength(1);

    expect(
      productAiJobActionResponseSchema.parse({
        success: true,
        job: {
          ...sampleProductAiJob,
          status: 'cancelled',
        },
      }).job.status
    ).toBe('cancelled');
  });

  it('parses queue mutation responses', () => {
    expect(
      productAiJobEnqueueResponseSchema.parse({
        success: true,
        jobId: 'job-2',
      }).jobId
    ).toBe('job-2');

    expect(
      productAiJobsClearResponseSchema.parse({
        success: true,
        count: 4,
      }).count
    ).toBe(4);
  });
});
