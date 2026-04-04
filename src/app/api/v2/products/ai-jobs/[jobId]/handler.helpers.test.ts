import { describe, expect, it } from 'vitest';

import {
  buildProductAiJobDeleteResponse,
  buildProductAiJobMutationResponse,
  buildProductAiJobResponse,
  requireProductAiJobId,
  resolveProductAiJobAction,
} from './handler.helpers';

describe('product ai-jobs by-id handler helpers', () => {
  it('requires a trimmed job id', () => {
    expect(requireProductAiJobId({ jobId: ' job-1 ' })).toBe('job-1');
    expect(() => requireProductAiJobId({ jobId: '   ' })).toThrow('Job id is required');
  });

  it('accepts the cancel action and rejects unsupported actions', () => {
    expect(resolveProductAiJobAction({ action: 'cancel' })).toBe('cancel');
    expect(() => resolveProductAiJobAction({ action: 'retry' })).toThrow('Invalid action');
  });

  it('builds read, mutation, and delete responses', () => {
    expect(buildProductAiJobResponse({ id: 'job-1' })).toEqual({
      job: { id: 'job-1' },
    });
    expect(buildProductAiJobMutationResponse({ id: 'job-1', status: 'cancelled' })).toEqual({
      success: true,
      job: { id: 'job-1', status: 'cancelled' },
    });
    expect(buildProductAiJobDeleteResponse()).toEqual({ success: true });
  });
});
