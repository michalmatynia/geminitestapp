import { describe, expect, it } from 'vitest';

import {
  defaultPromptEngineSettings,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import {
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
  PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS,
  validatePromptExploderParserTuningDrafts,
} from '@/features/prompt-exploder/parser-tuning';
import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack';

const getRuleById = (
  rules: PromptValidationRule[],
  id: string
): Extract<PromptValidationRule, { kind: 'regex' }> | null => {
  const rule = rules.find((entry) => entry.id === id);
  if (rule?.kind !== 'regex') return null;
  return rule;
};

describe('prompt exploder parser tuning', () => {
  it('builds quick-tuning drafts for all managed parser rule ids', () => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
      patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
    });

    expect(drafts.map((draft) => draft.id)).toEqual(PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS);
    expect(drafts.every((draft) => draft.pattern.trim().length > 0)).toBe(true);
  });

  it('validates parser tuning regex drafts', () => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
      patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
    });
    const validResult = validatePromptExploderParserTuningDrafts(drafts);
    expect(validResult.ok).toBe(true);

    const invalidResult = validatePromptExploderParserTuningDrafts([
      {
        ...drafts[0]!,
        pattern: '(',
      },
    ]);
    expect(invalidResult.ok).toBe(false);
  });

  it('applies parser tuning drafts into prompt engine settings rules', () => {
    const drafts: ReturnType<typeof buildPromptExploderParserTuningDrafts> =
      buildPromptExploderParserTuningDrafts({
        scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
      }).map((draft) =>
        draft.id === 'segment.boundary.pipeline'
          ? {
            ...draft,
            pattern: '^\\s*WORKSTEPS\\b',
            flags: 'mi',
            promptExploderSegmentType: 'hierarchical_list',
            promptExploderPriority: 31,
            promptExploderConfidenceBoost: 0.2,
          }
          : draft
      );

    const nextSettings = applyPromptExploderParserTuningDrafts({
      settings: defaultPromptEngineSettings,
      drafts,
      patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
    });
    const rule = getRuleById(nextSettings.promptValidation.rules, 'segment.boundary.pipeline');
    expect(rule).toBeTruthy();
    expect(rule?.pattern).toBe('^\\s*WORKSTEPS\\b');
    expect(rule?.promptExploderSegmentType).toBe('hierarchical_list');
    expect(rule?.promptExploderPriority).toBe(31);
    expect(rule?.promptExploderConfidenceBoost).toBe(0.2);
    expect(rule?.appliesToScopes?.includes('prompt_exploder')).toBe(true);
  });

  it('applies parser tuning drafts to Case Resolver scope when selected', () => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules: [],
      patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
      scope: 'case_resolver_prompt_exploder',
    });

    const nextSettings = applyPromptExploderParserTuningDrafts({
      settings: defaultPromptEngineSettings,
      drafts,
      patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
      scope: 'case_resolver_prompt_exploder',
    });

    const rule = getRuleById(nextSettings.promptValidation.rules, 'segment.boundary.pipeline');
    expect(rule).toBeTruthy();
    expect(rule?.appliesToScopes?.includes('case_resolver_prompt_exploder')).toBe(true);
    expect(rule?.launchAppliesToScopes?.includes('case_resolver_prompt_exploder')).toBe(true);
  });
});
