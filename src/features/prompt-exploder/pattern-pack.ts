import {
  defaultPromptEngineSettings,
  type PromptEngineSettings,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';

const PROMPT_EXPLODER_SCOPE = ['prompt_exploder'] as const;

const createRegexRule = (rule: {
  id: string;
  title: string;
  description: string;
  pattern: string;
  flags?: string;
  message: string;
  sequence: number;
  sequenceGroupId: string;
  sequenceGroupLabel: string;
}): PromptValidationRule => ({
  kind: 'regex',
  id: rule.id,
  enabled: true,
  severity: 'info',
  title: rule.title,
  description: rule.description,
  pattern: rule.pattern,
  flags: rule.flags ?? 'm',
  message: rule.message,
  similar: [],
  autofix: {
    enabled: false,
    operations: [],
  },
  sequenceGroupId: rule.sequenceGroupId,
  sequenceGroupLabel: rule.sequenceGroupLabel,
  sequenceGroupDebounceMs: 0,
  sequence: rule.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: [...PROMPT_EXPLODER_SCOPE],
  launchEnabled: false,
  launchAppliesToScopes: [...PROMPT_EXPLODER_SCOPE],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
});

export const PROMPT_EXPLODER_PATTERN_PACK: PromptValidationRule[] = [
  createRegexRule({
    id: 'segment.metadata.banner',
    title: 'Metadata Banner',
    description: 'Recognizes versioned metadata banners framed by ===.',
    pattern: '^\\s*={3,}.+={3,}\\s*$',
    flags: 'm',
    message: 'Metadata banner section detected.',
    sequence: 10,
    sequenceGroupId: 'exploder_metadata',
    sequenceGroupLabel: 'Exploder Metadata',
  }),
  createRegexRule({
    id: 'segment.heading.block',
    title: 'Section Heading',
    description: 'Detects uppercase section headings.',
    pattern: '^\\s*[A-Z][A-Z0-9 _()\\-/:&+.,]{3,}\\s*$',
    flags: 'm',
    message: 'Section heading detected.',
    sequence: 20,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
  }),
  createRegexRule({
    id: 'segment.params.block',
    title: 'Parameters Block',
    description: 'Detects params assignment block.',
    pattern: '\\bparams\\s*=\\s*\\{',
    flags: 'mi',
    message: 'Parameters block detected.',
    sequence: 30,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
  }),
  createRegexRule({
    id: 'segment.list.numeric',
    title: 'Numeric List',
    description: 'Detects numeric lists with 1) or 1. prefixes.',
    pattern: '^\\s*\\d+[.)]\\s+',
    flags: 'm',
    message: 'Numeric list detected.',
    sequence: 40,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
  }),
  createRegexRule({
    id: 'segment.list.bullet',
    title: 'Bullet List',
    description: 'Detects bullet lists with * or - markers.',
    pattern: '^\\s*[*-]\\s+',
    flags: 'm',
    message: 'Bullet list detected.',
    sequence: 50,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
  }),
  createRegexRule({
    id: 'segment.list.alpha_sequence',
    title: 'Alpha Sequence',
    description: 'Detects A) B) C) sequence headers.',
    pattern: '^\\s*[A-Z]\\)\\s+.+$',
    flags: 'm',
    message: 'Alpha sequence section detected.',
    sequence: 60,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
  }),
  createRegexRule({
    id: 'segment.reference.code',
    title: 'Reference Code',
    description: 'Detects referential section codes like P0, RL2, QA_R1.',
    pattern: '^\\s*(P\\d+|RL\\d+|QA(?:_R)?\\d+)\\b',
    flags: 'mi',
    message: 'Reference code section detected.',
    sequence: 70,
    sequenceGroupId: 'exploder_references',
    sequenceGroupLabel: 'Exploder References',
  }),
  createRegexRule({
    id: 'segment.conditional.only_if',
    title: 'Conditional: only if',
    description: 'Detects conditional blocks using “only if”.',
    pattern: '\\bonly if\\b',
    flags: 'mi',
    message: 'Conditional (only if) detected.',
    sequence: 80,
    sequenceGroupId: 'exploder_conditionals',
    sequenceGroupLabel: 'Exploder Conditionals',
  }),
  createRegexRule({
    id: 'segment.conditional.fix_until',
    title: 'Conditional: fix until',
    description: 'Detects iterative pass/fail constraints.',
    pattern: '\\bfix\\s+until\\b',
    flags: 'mi',
    message: 'Fix-until conditional detected.',
    sequence: 90,
    sequenceGroupId: 'exploder_conditionals',
    sequenceGroupLabel: 'Exploder Conditionals',
  }),
  createRegexRule({
    id: 'segment.pipeline.step',
    title: 'Pipeline Steps',
    description: 'Detects pipeline steps by ordered numbers.',
    pattern: '^\\s*\\d+\\.\\s+',
    flags: 'm',
    message: 'Pipeline step detected.',
    sequence: 100,
    sequenceGroupId: 'exploder_pipeline',
    sequenceGroupLabel: 'Exploder Pipeline',
  }),
  createRegexRule({
    id: 'segment.comment.patch',
    title: 'Patch Comment',
    description: 'Detects in-prompt patch comments.',
    pattern: '^\\s*//\\s*PATCH\\b',
    flags: 'mi',
    message: 'Patch comment detected.',
    sequence: 110,
    sequenceGroupId: 'exploder_metadata',
    sequenceGroupLabel: 'Exploder Metadata',
  }),
];

export type PromptExploderPatternPackResult = {
  nextSettings: PromptEngineSettings;
  addedRuleIds: string[];
  updatedRuleIds: string[];
};

export const PROMPT_EXPLODER_PATTERN_PACK_IDS = new Set(
  PROMPT_EXPLODER_PATTERN_PACK.map((rule) => rule.id)
);

export function ensurePromptExploderPatternPack(
  settings: PromptEngineSettings
): PromptExploderPatternPackResult {
  const baseSettings = settings?.promptValidation
    ? settings
    : defaultPromptEngineSettings;

  const existingById = new Map(
    baseSettings.promptValidation.rules.map((rule) => [rule.id, rule])
  );

  const nextRules = [...baseSettings.promptValidation.rules];
  const addedRuleIds: string[] = [];
  const updatedRuleIds: string[] = [];

  PROMPT_EXPLODER_PATTERN_PACK.forEach((packRule) => {
    const existing = existingById.get(packRule.id);
    if (!existing) {
      nextRules.push(packRule);
      addedRuleIds.push(packRule.id);
      return;
    }

    const existingScopes = existing.appliesToScopes ?? [];
    const missingPromptExploderScope = !existingScopes.includes('prompt_exploder');
    if (missingPromptExploderScope) {
      const merged: PromptValidationRule = {
        ...existing,
        appliesToScopes: [...new Set([...existingScopes, 'prompt_exploder'])],
      };
      const index = nextRules.findIndex((rule) => rule.id === existing.id);
      if (index >= 0) {
        nextRules[index] = merged;
      }
      updatedRuleIds.push(existing.id);
    }
  });

  return {
    nextSettings: {
      ...baseSettings,
      promptValidation: {
        ...baseSettings.promptValidation,
        rules: nextRules,
      },
    },
    addedRuleIds,
    updatedRuleIds,
  };
}

export function getPromptExploderScopedRules(
  settings: PromptEngineSettings
): PromptValidationRule[] {
  return settings.promptValidation.rules.filter((rule) => {
    const scopes = rule.appliesToScopes ?? [];
    return scopes.includes('prompt_exploder') || scopes.includes('global');
  });
}
