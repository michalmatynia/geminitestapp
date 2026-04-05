import { z } from 'zod';

import {
  promptEngineSettingsSchema,
  promptValidationRuleSchema,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/shared/contracts/prompt-engine';
import type {
  PromptValidationSeverity,
  PromptValidationChainMode,
  PromptValidationScope,
  PromptExploderRuleSegmentType,
  PromptValidationLaunchScopeBehavior,
  PromptValidationLaunchOperator,
  PromptExploderCaptureApplyTo,
  PromptExploderCaptureNormalize,
  PromptValidationSimilar,
  PromptAutofixOperation,
  PromptAutofix,
  PromptValidationRule,
  PromptValidationSettings,
  PromptEngineSettings,
} from '@/shared/contracts/prompt-engine';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export { PROMPT_ENGINE_SETTINGS_KEY };
export type {
  PromptValidationSeverity,
  PromptValidationChainMode,
  PromptValidationScope,
  PromptExploderRuleSegmentType,
  PromptValidationLaunchScopeBehavior,
  PromptValidationLaunchOperator,
  PromptExploderCaptureApplyTo,
  PromptExploderCaptureNormalize,
  PromptValidationSimilar,
  PromptAutofixOperation,
  PromptAutofix,
  PromptValidationRule,
  PromptValidationSettings,
  PromptEngineSettings,
};

export const PROMPT_VALIDATION_SCOPE_VALUES: PromptValidationScope[] = [
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'case_resolver_plain_text',
  'ai_paths',
  'kangur_ai_tutor_onboarding',
  'global',
];

export const DEFAULT_PROMPT_VALIDATION_SCOPES: PromptValidationScope[] = [
  ...PROMPT_VALIDATION_SCOPE_VALUES,
];
export const PROMPT_EXPLODER_RULE_SEGMENT_TYPE_VALUES: PromptExploderRuleSegmentType[] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];
export const PROMPT_EXPLODER_CAPTURE_APPLY_TO_VALUES: PromptExploderCaptureApplyTo[] = [
  'segment',
  'line',
];
export const PROMPT_EXPLODER_CAPTURE_NORMALIZE_VALUES: PromptExploderCaptureNormalize[] = [
  'trim',
  'lower',
  'upper',
  'country',
  'day',
  'month',
  'year',
];

export const PROMPT_VALIDATION_SCOPE_LABELS: Record<PromptValidationScope, string> = {
  image_studio_prompt: 'Image Studio Prompt',
  image_studio_extraction: 'Image Studio Extraction',
  image_studio_generation: 'Image Studio Generation',
  prompt_exploder: 'Prompt Exploder',
  case_resolver_prompt_exploder: 'Case Resolver Prompt Exploder',
  case_resolver_plain_text: 'Case Resolver Plain Text',
  ai_paths: 'AI Paths',
  kangur_ai_tutor_onboarding: 'Kangur AI Tutor Onboarding',
  global: 'Global',
};

export type PromptValidationSimilarPattern = PromptValidationSimilar;

export type PromptAutofixConfig = PromptAutofix;

export const defaultPromptValidationRules: PromptValidationRule[] = [
  {
    kind: 'params_object',
    id: 'params.object',
    enabled: true,
    severity: 'error',
    title: 'Params block',
    description:
      'Required for programmatic extraction. The params object must be JSON-parseable (quoted keys/strings).',
    message: 'Prompt must include a valid `params = { ... }` object for extraction.',
    similar: [
      {
        pattern: 'param\\s*=\\s*\\{',
        flags: 'i',
        suggestion: 'Use `params = {` (plural) instead of `param = {`.',
        comment: null,
      },
      {
        pattern: 'params\\s*:\\s*\\{',
        flags: 'i',
        suggestion: 'Use `params = {` (assignment) instead of `params: {`.',
        comment: null,
      },
      {
        pattern: 'parameters\\s*=\\s*\\{',
        flags: 'i',
        suggestion: 'Use `params = {` instead of `parameters = {`.',
        comment: null,
      },
    ],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '\\bparam\\s*[:=]\\s*\\{',
          flags: 'i',
          replacement: 'params = {',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '\\bparameters\\s*[:=]\\s*\\{',
          flags: 'i',
          replacement: 'params = {',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '\\bparams\\s*[:=]\\s*\\{',
          flags: 'i',
          replacement: 'params = {',
          comment: 'Normalizes casing/spaces so extraction can find `params = {`.',
        },
        {
          kind: 'params_json',
          comment: 'Attempts to convert the params object into strict JSON (quoted keys/strings).',
        },
      ],
    },
    sequenceGroupId: 'prompt_core',
    sequenceGroupLabel: 'Prompt Core',
    sequenceGroupDebounceMs: 0,
    sequence: 10,
    chainMode: 'continue',
    maxExecutions: 2,
    passOutputToNext: true,
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'section.role',
    enabled: true,
    severity: 'warning',
    title: 'ROLE section',
    description: 'Helps keep prompts consistent and readable.',
    pattern: '^##\\s+ROLE\\b',
    flags: 'mi',
    message: 'Missing `## ROLE` section heading.',
    similar: [
      { pattern: '^#+\\s*Role\\b', flags: 'mi', suggestion: 'Rename to `## ROLE`.', comment: null },
      {
        pattern: '^##\\s*ROL\\b',
        flags: 'mi',
        suggestion: 'Fix typo to `## ROLE`.',
        comment: null,
      },
    ],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '^#+\\s*role\\b.*$',
          flags: 'mi',
          replacement: '## ROLE',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '^#+\\s*rol\\b.*$',
          flags: 'mi',
          replacement: '## ROLE',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'prompt_core',
    sequenceGroupLabel: 'Prompt Core',
    sequenceGroupDebounceMs: 0,
    sequence: 20,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'section.non_negotiable_goal',
    enabled: true,
    severity: 'warning',
    title: 'NON-NEGOTIABLE GOAL section',
    description: 'Encouraged structure for strict editing prompts.',
    pattern: '^##\\s+NON-NEGOTIABLE\\s+GOAL\\b',
    flags: 'mi',
    message: 'Missing `## NON-NEGOTIABLE GOAL` section heading.',
    similar: [
      {
        pattern: '^##\\s+NON\\s*NEGOTIABLE\\s+GOAL\\b',
        flags: 'mi',
        suggestion: 'Use hyphenated `## NON-NEGOTIABLE GOAL`.',
        comment: null,
      },
      {
        pattern: '^#+\\s*Non[-\\s]?negotiable\\b',
        flags: 'mi',
        suggestion: 'Rename to `## NON-NEGOTIABLE GOAL`.',
        comment: null,
      },
    ],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '^#+\\s*non\\s*negotiable\\s+goal\\b.*$',
          flags: 'mi',
          replacement: '## NON-NEGOTIABLE GOAL',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '^#+\\s*non[-\\s]?negotiable\\b.*$',
          flags: 'mi',
          replacement: '## NON-NEGOTIABLE GOAL',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'prompt_core',
    sequenceGroupLabel: 'Prompt Core',
    sequenceGroupDebounceMs: 0,
    sequence: 30,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'section.params',
    enabled: true,
    severity: 'warning',
    title: 'PARAMS section',
    description: 'Expected to wrap the params block so it’s easy to find.',
    pattern: '^##\\s+PARAMS\\b',
    flags: 'mi',
    message: 'Missing `## PARAMS` section heading.',
    similar: [
      {
        pattern: '^##\\s*PARAM\\b',
        flags: 'mi',
        suggestion: 'Rename to `## PARAMS`.',
        comment: null,
      },
      {
        pattern: '^#+\\s*Params\\b',
        flags: 'mi',
        suggestion: 'Rename to `## PARAMS`.',
        comment: null,
      },
    ],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '^#+\\s*param\\b.*$',
          flags: 'mi',
          replacement: '## PARAMS',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '^#+\\s*params\\b.*$',
          flags: 'mi',
          replacement: '## PARAMS',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'prompt_core',
    sequenceGroupLabel: 'Prompt Core',
    sequenceGroupDebounceMs: 0,
    sequence: 40,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'section.final_qa',
    enabled: true,
    severity: 'info',
    title: 'FINAL QA section',
    description: 'Optional, but helps ensure the prompt includes a clear QA checklist.',
    pattern: '^##\\s+FINAL\\s+QA\\b',
    flags: 'mi',
    message: 'Missing `## FINAL QA` section heading.',
    similar: [
      {
        pattern: '^#+\\s*QA\\b',
        flags: 'mi',
        suggestion: 'Rename to `## FINAL QA`.',
        comment: null,
      },
    ],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '^#+\\s*qa\\b.*$',
          flags: 'mi',
          replacement: '## FINAL QA',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'prompt_core',
    sequenceGroupLabel: 'Prompt Core',
    sequenceGroupDebounceMs: 0,
    sequence: 50,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'case_resolver_plain_text.strip_html_tags',
    enabled: true,
    severity: 'warning',
    title: 'Strip HTML tags',
    description:
      'Converts HTML markup into plain text by normalizing line-break semantics and removing tags.',
    pattern: '^(?![\\s\\S]*<[^>]+>)[\\s\\S]*$',
    flags: '',
    message: 'HTML tags detected. Convert output to plain text.',
    similar: [],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '<br\\s*\\/?>',
          flags: 'gi',
          replacement: '\n',
          comment: 'Map explicit HTML line breaks to newline characters.',
        },
        {
          kind: 'replace',
          pattern: '<\\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|tr)>',
          flags: 'gi',
          replacement: '\n',
          comment: 'Preserve block boundaries while stripping markup.',
        },
        {
          kind: 'replace',
          pattern: '<li[^>]*>',
          flags: 'gi',
          replacement: '- ',
          comment: 'Keep list semantics for list-item tags.',
        },
        {
          kind: 'replace',
          pattern: '<[^>]+>',
          flags: 'gi',
          replacement: '',
          comment: 'Remove all remaining HTML tags.',
        },
      ],
    },
    sequenceGroupId: 'case_resolver_plain_text',
    sequenceGroupLabel: 'Case Resolver Plain Text',
    sequenceGroupDebounceMs: 0,
    sequence: 10,
    chainMode: 'continue',
    maxExecutions: 2,
    passOutputToNext: true,
    appliesToScopes: ['case_resolver_plain_text'],
    launchAppliesToScopes: ['case_resolver_plain_text'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'case_resolver_plain_text.decode_html_entities',
    enabled: true,
    severity: 'warning',
    title: 'Decode HTML entities',
    description:
      'Decodes common HTML entities into text equivalents for plain text connector output.',
    pattern: '^(?![\\s\\S]*&(nbsp|apos|#39|quot|gt|lt|amp);)[\\s\\S]*$',
    flags: 'i',
    message: 'HTML entities detected. Decode to plain text characters.',
    similar: [],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '&nbsp;',
          flags: 'gi',
          replacement: ' ',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '&apos;|&#39;',
          flags: 'gi',
          replacement: '\'',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '&quot;',
          flags: 'gi',
          replacement: '"',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '&gt;',
          flags: 'gi',
          replacement: '>',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '&lt;',
          flags: 'gi',
          replacement: '<',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '&amp;',
          flags: 'gi',
          replacement: '&',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'case_resolver_plain_text',
    sequenceGroupLabel: 'Case Resolver Plain Text',
    sequenceGroupDebounceMs: 0,
    sequence: 20,
    chainMode: 'continue',
    maxExecutions: 2,
    passOutputToNext: true,
    appliesToScopes: ['case_resolver_plain_text'],
    launchAppliesToScopes: ['case_resolver_plain_text'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'case_resolver_plain_text.normalize_whitespace',
    enabled: true,
    severity: 'info',
    title: 'Normalize plain text whitespace',
    description:
      'Cleans redundant spaces/newlines after HTML stripping to keep connector output stable.',
    pattern:
      '^(?!\\s)(?![\\s\\S]*\\n{3,})(?![\\s\\S]*[ \\t]+\\n)(?![\\s\\S]*\\n[ \\t]+)(?![\\s\\S]*\\s$)[\\s\\S]*$|^$',
    flags: '',
    message: 'Whitespace normalization required for plain text output.',
    similar: [],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: '[ \\t]+\\n',
          flags: 'g',
          replacement: '\n',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '\\n[ \\t]+',
          flags: 'g',
          replacement: '\n',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '\\n{3,}',
          flags: 'g',
          replacement: '\n\n',
          comment: null,
        },
        {
          kind: 'replace',
          pattern: '^\\s+|\\s+$',
          flags: 'g',
          replacement: '',
          comment: null,
        },
      ],
    },
    sequenceGroupId: 'case_resolver_plain_text',
    sequenceGroupLabel: 'Case Resolver Plain Text',
    sequenceGroupDebounceMs: 0,
    sequence: 30,
    chainMode: 'continue',
    maxExecutions: 2,
    passOutputToNext: true,
    appliesToScopes: ['case_resolver_plain_text'],
    launchAppliesToScopes: ['case_resolver_plain_text'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'kangur.onboarding.no_placeholders',
    enabled: true,
    severity: 'error',
    title: 'No placeholder copy',
    description:
      'Kangur AI Tutor onboarding entries must not contain placeholder or unfinished copy.',
    pattern:
      '^(?![\\s\\S]*(?:\\bTODO\\b|\\bTBD\\b|placeholder|lorem ipsum|uzupelnic|uzupełnić|do uzupelnienia|do uzupełnienia))[\\s\\S]*$',
    flags: 'i',
    message: 'Remove placeholder or unfinished onboarding copy before saving.',
    similar: [],
    sequenceGroupId: 'kangur_onboarding_hygiene',
    sequenceGroupLabel: 'Kangur Onboarding Hygiene',
    sequenceGroupDebounceMs: 0,
    sequence: 10,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    appliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchAppliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'kangur.onboarding.no_raw_urls',
    enabled: true,
    severity: 'warning',
    title: 'No raw links or API fragments',
    description:
      'Onboarding copy should describe navigation in product language, not expose raw URLs or API paths.',
    pattern: '^(?![\\s\\S]*(?:https?:\\/\\/|\\/api\\/))[\\s\\S]*$',
    flags: 'i',
    message: 'Replace raw links or API fragments with native Kangur navigation wording.',
    similar: [],
    sequenceGroupId: 'kangur_onboarding_hygiene',
    sequenceGroupLabel: 'Kangur Onboarding Hygiene',
    sequenceGroupDebounceMs: 0,
    sequence: 20,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    appliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchAppliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'kangur.onboarding.no_admin_tokens',
    enabled: true,
    severity: 'warning',
    title: 'No admin or technical tokens',
    description:
      'Native tutor onboarding should not leak implementation terms such as MongoDB, schema, or endpoint.',
    pattern: '^(?![\\s\\S]*(?:mongodb|json|schema|endpoint))[\\s\\S]*$',
    flags: 'i',
    message: 'Remove admin or technical wording from native tutor onboarding copy.',
    similar: [],
    sequenceGroupId: 'kangur_onboarding_hygiene',
    sequenceGroupLabel: 'Kangur Onboarding Hygiene',
    sequenceGroupDebounceMs: 0,
    sequence: 30,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    appliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchAppliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
  {
    kind: 'regex',
    id: 'kangur.onboarding.non_spoiler_hints',
    enabled: true,
    severity: 'error',
    title: 'Non-spoiler hints only',
    description:
      'Hints for Kangur games and tests must guide the learner without revealing answers directly.',
    pattern:
      '^(?![\\s\\S]*(?:poprawna odpowiedz|prawidlowa odpowiedz|prawidłowa odpowiedź|właściwa odpowiedz|właściwa odpowiedź|odpowiedz to|odpowiedź to|wynik to))[\\s\\S]*$',
    flags: 'i',
    message: 'Hints must stay non-spoiler and cannot reveal the answer directly.',
    similar: [],
    sequenceGroupId: 'kangur_onboarding_guardrails',
    sequenceGroupLabel: 'Kangur Onboarding Guardrails',
    sequenceGroupDebounceMs: 0,
    sequence: 10,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    appliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchAppliesToScopes: ['kangur_ai_tutor_onboarding'],
    launchScopeBehavior: 'gate',
    launchEnabled: false,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
  },
];

export const defaultPromptEngineSettings: PromptEngineSettings = {
  version: 1,
  promptValidation: {
    enabled: true,
    rules: defaultPromptValidationRules,
    learnedRules: [],
  },
};

const DEFAULT_PROMPT_VALIDATION_RULES_BY_ID = new Map(
  defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule])
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readStoredPromptValidationRules = (parsed: unknown): unknown[] | null => {
  if (!isPlainObject(parsed)) return null;
  const promptValidation = parsed['promptValidation'];
  if (!isPlainObject(promptValidation)) return null;
  return Array.isArray(promptValidation['rules']) ? promptValidation['rules'] : null;
};

const hasStoredAutofixMetadata = (rawRules: unknown[] | null): boolean =>
  Array.isArray(rawRules)
    ? rawRules.some(
      (rule: unknown) => isPlainObject(rule) && Object.hasOwn(rule, 'autofix')
    )
    : false;

const mergePromptValidationRuleAutofix = (
  rule: PromptValidationRule,
  hadAutofixInStorage: boolean
): PromptValidationRule => {
  const defaults = DEFAULT_PROMPT_VALIDATION_RULES_BY_ID.get(rule.id);
  if (hadAutofixInStorage || !defaults?.autofix || defaults.autofix.operations.length === 0) {
    return rule;
  }

  const needsAutofix =
    !rule.autofix ||
    !Array.isArray(rule.autofix.operations) ||
    rule.autofix.operations.length === 0;
  return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
};

const appendMissingDefaultPromptValidationRules = (
  rules: PromptValidationRule[]
): PromptValidationRule[] => {
  const existingRuleIds = new Set(rules.map((rule: PromptValidationRule) => rule.id));
  const missingDefaults = defaultPromptValidationRules.filter(
    (rule: PromptValidationRule): boolean => !existingRuleIds.has(rule.id)
  );
  return missingDefaults.length > 0 ? [...rules, ...missingDefaults] : rules;
};

const mergePromptValidationRuleAutofixWithDefaults = (input: {
  rules: PromptValidationRule[];
  hadAutofixInStorage: boolean;
}): PromptValidationRule[] =>
  input.rules.map((rule: PromptValidationRule) =>
    mergePromptValidationRuleAutofix(rule, input.hadAutofixInStorage)
  );

const mergePromptValidationRulesWithDefaults = (input: {
  rules: PromptValidationRule[];
  hadAutofixInStorage: boolean;
}): PromptValidationRule[] =>
  appendMissingDefaultPromptValidationRules(
    mergePromptValidationRuleAutofixWithDefaults(input)
  );

const normalizePromptEngineSettings = (input: {
  parsed: unknown;
  settings: PromptEngineSettings;
}): PromptEngineSettings => ({
  ...input.settings,
  promptValidation: {
    ...input.settings.promptValidation,
    rules: mergePromptValidationRulesWithDefaults({
      rules: input.settings.promptValidation.rules,
      hadAutofixInStorage: hasStoredAutofixMetadata(readStoredPromptValidationRules(input.parsed)),
    }),
    learnedRules: input.settings.promptValidation.learnedRules ?? [],
  },
});

export function parsePromptEngineSettings(raw: string | null | undefined): PromptEngineSettings {
  if (!raw) return defaultPromptEngineSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = promptEngineSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultPromptEngineSettings;
    return normalizePromptEngineSettings({
      parsed,
      settings: result.data,
    });
  } catch (error) {
    logClientCatch(error, {
      source: 'prompt-engine.settings',
      action: 'normalizePromptEngineSettings',
      valueType: typeof raw,
    });
    return defaultPromptEngineSettings;
  }
}

export function parsePromptValidationRules(
  raw: string
): { ok: true; rules: PromptValidationRule[] } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(promptValidationRuleSchema).safeParse(parsed);
    if (result.success) {
      return {
        ok: true,
        rules: mergePromptValidationRuleAutofixWithDefaults({
          rules: result.data,
          hadAutofixInStorage: hasStoredAutofixMetadata(Array.isArray(parsed) ? parsed : null),
        }),
      };
    }
    return { ok: false, error: 'Invalid rules shape. Expected an array of rule objects.' };
  } catch (error) {
    logClientCatch(error, {
      source: 'prompt-engine.settings',
      action: 'parsePromptValidationRules',
      valueLength: raw.length,
    });
    return { ok: false, error: 'Invalid JSON.' };
  }
}
