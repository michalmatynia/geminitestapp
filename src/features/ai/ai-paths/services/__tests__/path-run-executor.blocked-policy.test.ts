import { describe, expect, it } from 'vitest';

import { shouldFailBlockedRun } from '@/features/ai/ai-paths/services/path-run-executor.diagnostics';

describe('path-run blocked policy', () => {
  it('fails blocked runs only when node validation is enabled and policy is fail_run', () => {
    expect(
      shouldFailBlockedRun({
        runBlocked: true,
        blockedRunPolicy: 'fail_run',
        nodeValidationEnabled: true,
      })
    ).toBe(true);
  });

  it('does not fail blocked runs when node validation is disabled', () => {
    expect(
      shouldFailBlockedRun({
        runBlocked: true,
        blockedRunPolicy: 'fail_run',
        nodeValidationEnabled: false,
      })
    ).toBe(false);
  });

  it('does not fail blocked runs when policy is complete_with_warning', () => {
    expect(
      shouldFailBlockedRun({
        runBlocked: true,
        blockedRunPolicy: 'complete_with_warning',
        nodeValidationEnabled: true,
      })
    ).toBe(false);
  });
});
