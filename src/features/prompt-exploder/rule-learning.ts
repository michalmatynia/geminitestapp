import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { mergeRegexPatternsForRule } from './rule-merge';

type PromptValidationRegexRule = Extract<PromptValidationRule, { kind: 'regex' }>;

export const mergeRegexLearnedRule = (args: {
  existingRule: PromptValidationRule | null | undefined;
  incomingRule: PromptValidationRegexRule;
}): { nextRule: PromptValidationRule; wasUpdate: boolean } => {
  const existingRule = args.existingRule ?? null;
  const nextRule: PromptValidationRule =
    existingRule?.kind === 'regex'
      ? {
        ...args.incomingRule,
        pattern: mergeRegexPatternsForRule(existingRule.pattern, args.incomingRule.pattern),
        similar: existingRule.similar ?? args.incomingRule.similar,
        sequence:
            (typeof existingRule.sequence === 'number'
              ? existingRule.sequence
              : args.incomingRule.sequence) ?? null,
      }
      : args.incomingRule;

  return {
    nextRule,
    wasUpdate: Boolean(existingRule),
  };
};

export const upsertRegexLearnedRule = (args: {
  rules: PromptValidationRule[];
  incomingRule: PromptValidationRegexRule;
}): {
  nextRules: PromptValidationRule[];
  nextRule: PromptValidationRule;
  wasUpdate: boolean;
} => {
  const existingRule = args.rules.find((rule) => rule.id === args.incomingRule.id) ?? null;
  const merged = mergeRegexLearnedRule({
    existingRule,
    incomingRule: args.incomingRule,
  });
  return {
    nextRule: merged.nextRule,
    nextRules: [...args.rules.filter((rule) => rule.id !== merged.nextRule.id), merged.nextRule],
    wasUpdate: merged.wasUpdate,
  };
};
