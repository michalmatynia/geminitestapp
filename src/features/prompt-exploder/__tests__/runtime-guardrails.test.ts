import { describe, expect, it } from 'vitest';

import type { PromptValidationOrchestrationResult } from '@/features/prompt-exploder/prompt-validation-orchestrator';
import { getPromptExploderRuntimeGuardrailIssue } from '@/features/prompt-exploder/runtime-guardrails';

const createRuntimeSelection = (args: {
  stack: string;
  usedFallback: boolean;
  reason: PromptValidationOrchestrationResult['stackResolution']['reason'];
}): PromptValidationOrchestrationResult =>
  ({
    correlationId: 'test-correlation',
    stackResolution: {
      stack: args.stack,
      scope: 'prompt-exploder',
      validatorScope: 'prompt-exploder',
      list: null,
      usedFallback: args.usedFallback,
      reason: args.reason,
    },
    identity: {
      scope: 'prompt_exploder',
      validatorScope: 'prompt-exploder',
      stack: args.stack,
      profile: 'all',
      settingsVersion: 'settings-v1',
      listVersion: 'list-v1',
      cacheKey: 'runtime-cache-key',
    },
    scopedRules: [],
    effectiveRules: [],
    runtimeValidationRules: [],
    effectiveLearnedTemplates: [],
    runtimeLearnedTemplates: [],
  }) as PromptValidationOrchestrationResult;

describe('prompt exploder runtime guardrails', () => {
  it('returns a blocking issue when fallback is used and not allowed', () => {
    const runtimeSelection = createRuntimeSelection({
      stack: 'prompt-exploder',
      usedFallback: true,
      reason: 'invalid_stack',
    });

    const issue = getPromptExploderRuntimeGuardrailIssue({
      runtimeSelection,
      allowValidationStackFallback: false,
    });

    expect(issue).toContain('blocked runtime execution');
    expect(issue).toContain('invalid stack fallback');
  });

  it('returns null when fallback is allowed', () => {
    const runtimeSelection = createRuntimeSelection({
      stack: 'prompt-exploder',
      usedFallback: true,
      reason: 'scope_fallback',
    });

    const issue = getPromptExploderRuntimeGuardrailIssue({
      runtimeSelection,
      allowValidationStackFallback: true,
    });

    expect(issue).toBeNull();
  });

  it('returns null when runtime did not use fallback', () => {
    const runtimeSelection = createRuntimeSelection({
      stack: 'prompt-exploder',
      usedFallback: false,
      reason: 'exact_match',
    });

    const issue = getPromptExploderRuntimeGuardrailIssue({
      runtimeSelection,
      allowValidationStackFallback: false,
    });

    expect(issue).toBeNull();
  });
});
