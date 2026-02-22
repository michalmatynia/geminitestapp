import { describe, expect, it } from 'vitest';

import {
  defaultPromptEngineSettings,
  type PromptEngineSettings,
  type PromptValidationScope,
} from '@/features/prompt-engine/settings';
import {
  ensurePromptExploderPatternPack,
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK,
} from '@/features/prompt-exploder/pattern-pack';

describe('prompt exploder pattern pack', () => {
  it('filters scoped rules by selected validation scope', () => {
    const settings: PromptEngineSettings = {
      ...defaultPromptEngineSettings,
      promptValidation: {
        ...defaultPromptEngineSettings.promptValidation,
        rules: [
          {
            ...PROMPT_EXPLODER_PATTERN_PACK[0]!,
            id: 'rule.prompt',
            appliesToScopes: ['prompt_exploder'] as PromptValidationScope[],
          },
          {
            ...PROMPT_EXPLODER_PATTERN_PACK[0]!,
            id: 'rule.case',
            appliesToScopes: ['case_resolver_prompt_exploder'] as PromptValidationScope[],
          },
          {
            ...PROMPT_EXPLODER_PATTERN_PACK[0]!,
            id: 'rule.global',
            appliesToScopes: ['global'] as PromptValidationScope[],
          },
        ],
      },
    };

    const promptRules = getPromptExploderScopedRules(settings, 'prompt_exploder', { includePatternPack: false });
    const caseRules = getPromptExploderScopedRules(settings, 'case_resolver_prompt_exploder', { includePatternPack: false });
    expect(promptRules.map((rule) => rule.id)).toEqual(['rule.prompt', 'rule.global']);
    expect(caseRules.map((rule) => rule.id)).toEqual(['rule.case', 'rule.global']);
  });

  it('installs pattern pack into case resolver scope without overwriting image stack rules', () => {
    const sourceRule = PROMPT_EXPLODER_PATTERN_PACK[0]!;
    const settings: PromptEngineSettings = {
      ...defaultPromptEngineSettings,
      promptValidation: {
        ...defaultPromptEngineSettings.promptValidation,
        rules: [
          {
            ...sourceRule,
            appliesToScopes: ['prompt_exploder'] as PromptValidationScope[],
            launchAppliesToScopes: ['prompt_exploder'] as PromptValidationScope[],
          },
        ],
      },
    };

    const result = ensurePromptExploderPatternPack(settings, {
      scope: 'case_resolver_prompt_exploder',
    });
    const matchingRules = result.nextSettings.promptValidation.rules.filter(
      (rule) => rule.id === sourceRule.id
    );

    expect(matchingRules.length).toBeGreaterThanOrEqual(2);
    expect(
      matchingRules.some((rule) =>
        (rule.appliesToScopes ?? []).includes('prompt_exploder')
      )
    ).toBe(true);
    expect(
      matchingRules.some((rule) =>
        (rule.appliesToScopes ?? []).includes('case_resolver_prompt_exploder')
      )
    ).toBe(true);
  });
});
