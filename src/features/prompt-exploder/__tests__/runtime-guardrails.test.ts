import { describe, expect, it } from 'vitest';

import type { PromptValidationOrchestrationResult } from '@/features/prompt-exploder/prompt-validation-orchestrator';
import { getPromptExploderRuntimeGuardrailIssue } from '@/features/prompt-exploder/runtime-guardrails';

const createRuntimeSelection = (args: {
  stack: string;
  usedFallback: boolean;
}): PromptValidationOrchestrationResult =>
  ({
    correlationId: 'test-correlation',
    stackResolution: {
      stack: args.stack,
      scope: 'prompt_exploder',
      validatorScope: 'prompt-exploder',
      list: null,
      usedFallback: args.usedFallback,
      reason: 'exact_match',
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
  }) as unknown as PromptValidationOrchestrationResult;

describe('prompt exploder runtime guardrails', () => {
  it('returns a blocking issue when fallback is reported', () => {
    const runtimeSelection = createRuntimeSelection({
      stack: 'prompt-exploder',
      usedFallback: true,
    });

    const issue = getPromptExploderRuntimeGuardrailIssue({
      runtimeSelection,
    });

    expect(issue).toContain('blocked runtime execution');
    expect(issue).toContain('legacy stack fallback paths are disabled');
  });

  it('returns null when runtime did not use fallback', () => {
    const runtimeSelection = createRuntimeSelection({
      stack: 'prompt-exploder',
      usedFallback: false,
    });

    const issue = getPromptExploderRuntimeGuardrailIssue({
      runtimeSelection,
    });

    expect(issue).toBeNull();
  });
});
