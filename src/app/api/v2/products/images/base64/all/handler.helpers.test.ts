import { describe, expect, it } from 'vitest';

import {
  BASE64_ALL_JOB_SOURCE,
  BASE64_ALL_JOB_TYPE,
  buildBase64AllFailureLogInput,
  buildBase64AllJobPayload,
  buildBase64AllResponse,
  resolveBase64AllJobMode,
} from './handler.helpers';

describe('product images base64 all handler helpers', () => {
  it('resolves inline vs queued mode from env', () => {
    expect(resolveBase64AllJobMode({ NODE_ENV: 'test' })).toBe('inline');
    expect(resolveBase64AllJobMode({ NODE_ENV: 'production' })).toBe('queued');
    expect(resolveBase64AllJobMode({ NODE_ENV: 'production', AI_JOBS_INLINE: 'true' })).toBe(
      'inline'
    );
  });

  it('builds the fixed job payload, failure log input, and response', () => {
    expect(BASE64_ALL_JOB_TYPE).toBe('base64_all');
    expect(buildBase64AllJobPayload()).toEqual({
      source: BASE64_ALL_JOB_SOURCE,
    });
    expect(buildBase64AllFailureLogInput('job-1', 'boom')).toEqual({
      message: '[products.images.base64.all] Failed to run base64 job',
      error: 'boom',
      source: 'api/products/images/base64/all',
      context: { jobId: 'job-1' },
    });
    expect(buildBase64AllResponse('job-1')).toEqual({
      status: 'ok',
      jobId: 'job-1',
    });
  });
});
