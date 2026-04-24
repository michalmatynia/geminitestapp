import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  recoverBlockedLeaseRuns,
  recoverStaleRunningRuns,
  resolveAiPathsStaleRunningCleanupIntervalMs,
  resolveAiPathsStaleRunningMaxAgeMs,
} from '@/features/ai/ai-paths/services/path-run-recovery-service';

const ORIGINAL_MAX_AGE = process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'];

describe('path-run-recovery-service', () => {
  beforeEach(() => {
    delete process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'];
  });

  afterEach(() => {
    if (ORIGINAL_MAX_AGE === undefined) {
      delete process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'];
    } else {
      process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'] = ORIGINAL_MAX_AGE;
    }
  });

  it('parses stale-run max age and hard-disables recovery cadence', () => {
    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(0);

    process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'] = '45000';
    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(45_000);

    process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'] = '0';
    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
  });

  it('returns zero for disabled stale-run cleanup and blocked-lease recovery', async () => {
    await expect(recoverStaleRunningRuns()).resolves.toBe(0);
    await expect(recoverBlockedLeaseRuns()).resolves.toBe(0);
  });
});
