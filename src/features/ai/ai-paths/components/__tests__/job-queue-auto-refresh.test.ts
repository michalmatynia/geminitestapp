import { describe, expect, it } from 'vitest';

import {
  DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL,
  normalizeJobQueueAutoRefreshInterval,
} from '../job-queue-auto-refresh';

describe('normalizeJobQueueAutoRefreshInterval', () => {
  it('keeps supported intervals unchanged', () => {
    expect(normalizeJobQueueAutoRefreshInterval(5000)).toBe(5000);
    expect(normalizeJobQueueAutoRefreshInterval('10000')).toBe(10000);
    expect(normalizeJobQueueAutoRefreshInterval(30000)).toBe(30000);
    expect(normalizeJobQueueAutoRefreshInterval(60000)).toBe(60000);
  });

  it('falls back to the default interval for unsupported persisted values', () => {
    expect(normalizeJobQueueAutoRefreshInterval('')).toBe(DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL);
    expect(normalizeJobQueueAutoRefreshInterval('15000')).toBe(
      DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL
    );
    expect(normalizeJobQueueAutoRefreshInterval(Number.NaN)).toBe(
      DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL
    );
    expect(normalizeJobQueueAutoRefreshInterval(undefined)).toBe(
      DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL
    );
  });
});
