import { describe, expect, it } from 'vitest';

import { buildCompileWarningMessage } from '../compile-warning-message';

describe('buildCompileWarningMessage', () => {
  it('returns a generic warning when no warning findings are present', () => {
    const message = buildCompileWarningMessage({
      warnings: 1,
      findings: [],
    });
    expect(message).toContain('Graph compile warnings detected (1)');
    expect(message).toContain('Compile Inspector');
  });

  it('includes cycle node labels in cycle warnings', () => {
    const message = buildCompileWarningMessage({
      warnings: 1,
      findings: [
        {
          severity: 'warning',
          code: 'cycle_detected',
          message: 'Detected a circular loop across 2 node(s).',
          metadata: {
            nodeLabels: ['Trigger', 'Simulation'],
          },
        },
      ],
    });
    expect(message).toContain('Graph compile warning (cycle_detected)');
    expect(message).toContain('Affected nodes: Trigger, Simulation.');
    expect(message).toContain('Compile Inspector');
  });

  it('preserves explicit fix hints without appending inspector suffix', () => {
    const message = buildCompileWarningMessage({
      warnings: 1,
      findings: [
        {
          severity: 'warning',
          code: 'legacy_warning',
          message: 'Use the canonical Fetcher flow. Fix: replace the old Trigger path.',
        },
      ],
    });
    expect(message).toContain('Fix: replace the old Trigger path.');
    expect(message).not.toContain('Compile Inspector for details');
  });

  it('adds prompt-loop inspector hint for model prompt deadlock risk', () => {
    const message = buildCompileWarningMessage({
      warnings: 1,
      findings: [
        {
          severity: 'warning',
          code: 'model_prompt_deadlock_risk',
          message: 'Model prompt may never resolve in this loop.',
        },
      ],
    });
    expect(message).toContain('Graph compile warning (model_prompt_deadlock_risk)');
    expect(message).toContain('Compile Inspector');
  });

  it('adds cache-scope inspector hint for context cache scope risk', () => {
    const message = buildCompileWarningMessage({
      warnings: 1,
      findings: [
        {
          severity: 'warning',
          code: 'context_cache_scope_risk',
          message: 'Fetcher cache scope can reuse outputs across entities.',
        },
      ],
    });
    expect(message).toContain('Graph compile warning (context_cache_scope_risk)');
    expect(message).toContain('Compile Inspector');
    expect(message).toContain('cache mode/scope');
  });
});
