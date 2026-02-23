import { z } from 'zod';

import { 
  PromptValidationSeverityDto,
  PromptValidationChainModeDto,
  PromptValidationScopeDto,
  PromptValidationLaunchScopeBehaviorDto,
  PromptValidationLaunchOperatorDto,
  PromptExploderCaptureApplyToDto,
  PromptExploderCaptureNormalizeDto,
  PromptValidationSimilarDto,
  PromptAutofixOperationDto,
  PromptAutofixDto,
  PromptValidationRuleDto,
  PromptValidationSettingsDto,
  PromptEngineSettingsDto,
  promptEngineSettingsSchema,
  promptValidationRuleSchema,
} from '@/shared/contracts/prompt-engine';
import { PromptExploderSegmentTypeDto } from '@/shared/contracts/prompt-exploder';

export const PROMPT_ENGINE_SETTINGS_KEY = 'prompt_engine_settings';

export type PromptValidationSeverity = PromptValidationSeverityDto;
export type PromptValidationChainMode = PromptValidationChainModeDto;
export type PromptValidationScope = PromptValidationScopeDto;
export type PromptValidationLaunchScopeBehavior = PromptValidationLaunchScopeBehaviorDto;
export type PromptValidationLaunchOperator = PromptValidationLaunchOperatorDto;
export type PromptExploderRuleSegmentType = PromptExploderSegmentTypeDto;
export type PromptExploderCaptureApplyTo = PromptExploderCaptureApplyToDto;
export type PromptExploderCaptureNormalize = PromptExploderCaptureNormalizeDto;

export const PROMPT_VALIDATION_SCOPE_VALUES: PromptValidationScope[] = [
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
  'prompt_exploder',
  'case_resolver_prompt_exploder',
  'case_resolver_plain_text',
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
  global: 'Global',
};

export type PromptValidationSimilarPattern = PromptValidationSimilarDto;

export type PromptAutofixOperation = PromptAutofixOperationDto;

export type PromptAutofixConfig = PromptAutofixDto;

export type PromptValidationRule = PromptValidationRuleDto;

export type PromptValidationSettings = PromptValidationSettingsDto;

export type PromptEngineSettings = PromptEngineSettingsDto;

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
      { pattern: 'param\\s*=\\s*\\{', flags: 'i', suggestion: 'Use `params = {` (plural) instead of `param = {`.', comment: null },
      { pattern: 'params\\s*:\\s*\\{', flags: 'i', suggestion: 'Use `params = {` (assignment) instead of `params: {`.', comment: null },
      { pattern: 'parameters\\s*=\\s*\\{', flags: 'i', suggestion: 'Use `params = {` instead of `parameters = {`.', comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: 'replace', pattern: '\\bparam\\s*[:=]\\s*\\{', flags: 'i', replacement: 'params = {', comment: null },
        { kind: 'replace', pattern: '\\bparameters\\s*[:=]\\s*\\{', flags: 'i', replacement: 'params = {', comment: null },
        { kind: 'replace', pattern: '\\bparams\\s*[:=]\\s*\\{', flags: 'i', replacement: 'params = {', comment: 'Normalizes casing/spaces so extraction can find `params = {`.' },
        { kind: 'params_json', comment: 'Attempts to convert the params object into strict JSON (quoted keys/strings).' },
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
      { pattern: '^##\\s*ROL\\b', flags: 'mi', suggestion: 'Fix typo to `## ROLE`.', comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: 'replace', pattern: '^#+\\s*role\\b.*$', flags: 'mi', replacement: '## ROLE', comment: null },
        { kind: 'replace', pattern: '^#+\\s*rol\\b.*$', flags: 'mi', replacement: '## ROLE', comment: null },
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
      { pattern: '^##\\s+NON\\s*NEGOTIABLE\\s+GOAL\\b', flags: 'mi', suggestion: 'Use hyphenated `## NON-NEGOTIABLE GOAL`.', comment: null },
      { pattern: '^#+\\s*Non[-\\s]?negotiable\\b', flags: 'mi', suggestion: 'Rename to `## NON-NEGOTIABLE GOAL`.', comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: 'replace', pattern: '^#+\\s*non\\s*negotiable\\s+goal\\b.*$', flags: 'mi', replacement: '## NON-NEGOTIABLE GOAL', comment: null },
        { kind: 'replace', pattern: '^#+\\s*non[-\\s]?negotiable\\b.*$', flags: 'mi', replacement: '## NON-NEGOTIABLE GOAL', comment: null },
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
      { pattern: '^##\\s*PARAM\\b', flags: 'mi', suggestion: 'Rename to `## PARAMS`.', comment: null },
      { pattern: '^#+\\s*Params\\b', flags: 'mi', suggestion: 'Rename to `## PARAMS`.', comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: 'replace', pattern: '^#+\\s*param\\b.*$', flags: 'mi', replacement: '## PARAMS', comment: null },
        { kind: 'replace', pattern: '^#+\\s*params\\b.*$', flags: 'mi', replacement: '## PARAMS', comment: null },
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
      { pattern: '^#+\\s*QA\\b', flags: 'mi', suggestion: 'Rename to `## FINAL QA`.', comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: 'replace', pattern: '^#+\\s*qa\\b.*$', flags: 'mi', replacement: '## FINAL QA', comment: null },
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
];

export const defaultPromptEngineSettings: PromptEngineSettings = {
  version: 1,
  promptValidation: {
    enabled: true,
    rules: defaultPromptValidationRules,
    learnedRules: [],
  },
};

export function parsePromptEngineSettings(raw: string | null | undefined): PromptEngineSettings {
  if (!raw) return defaultPromptEngineSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = promptEngineSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultPromptEngineSettings;

    const rawRules = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      ? (parsed as Record<string, unknown>)?.['promptValidation']
      : null;
    const rawRulesArray =
      rawRules && typeof rawRules === 'object' && !Array.isArray(rawRules)
        ? (rawRules as Record<string, unknown>)?.['rules']
        : null;
    const hadAutofixInStorage = Array.isArray(rawRulesArray)
      ? rawRulesArray.some((rule: unknown) => Boolean(rule) && typeof rule === 'object' && 'autofix' in (rule as Record<string, unknown>))
      : false;

    const defaultById = new Map(defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule]));
    const mergedRules = result.data.promptValidation.rules.map((rule: PromptValidationRule) => {
      const defaults = defaultById.get(rule.id);
      if (hadAutofixInStorage || !defaults?.autofix || defaults.autofix.operations.length === 0) {
        return rule;
      }
      const needsAutofix =
        !rule.autofix ||
        !Array.isArray(rule.autofix.operations) ||
        rule.autofix.operations.length === 0;
      return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
    });
    const existingRuleIds = new Set(mergedRules.map((rule: PromptValidationRule) => rule.id));
    const missingDefaults = defaultPromptValidationRules.filter(
      (rule: PromptValidationRule): boolean => !existingRuleIds.has(rule.id)
    );
    const mergedWithMissingDefaults =
      missingDefaults.length > 0 ? [...mergedRules, ...missingDefaults] : mergedRules;

    return {
      ...result.data,
      promptValidation: {
        ...result.data.promptValidation,
        rules: mergedWithMissingDefaults,
        learnedRules: result.data.promptValidation.learnedRules ?? [],
      },
    } as PromptEngineSettings;
  } catch {
    return defaultPromptEngineSettings;
  }
}

export function parsePromptValidationRules(raw: string): { ok: true; rules: PromptValidationRule[] } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(promptValidationRuleSchema).safeParse(parsed);
    if (result.success) {
      const hadAutofix = Array.isArray(parsed)
        ? parsed.some((rule: unknown) => Boolean(rule) && typeof rule === 'object' && 'autofix' in (rule as Record<string, unknown>))
        : false;
      if (hadAutofix) return { ok: true, rules: result.data };

      const defaultById = new Map(defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule]));
      const mergedRules = result.data.map((rule: PromptValidationRule) => {
        const defaults = defaultById.get(rule.id);
        if (!defaults?.autofix || defaults.autofix.operations.length === 0) return rule;
        const needsAutofix =
          !rule.autofix ||
          !Array.isArray(rule.autofix.operations) ||
          rule.autofix.operations.length === 0;
        return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
      });

      return { ok: true, rules: mergedRules };
    }
    return { ok: false, error: 'Invalid rules shape. Expected an array of rule objects.' };
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
}
