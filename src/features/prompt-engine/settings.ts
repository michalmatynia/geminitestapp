import { z } from 'zod';

export const PROMPT_ENGINE_SETTINGS_KEY = 'prompt_engine_settings';

export type PromptValidationSeverity = 'error' | 'warning' | 'info';
export type PromptValidationChainMode = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type PromptValidationLaunchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export type PromptValidationSimilarPattern = {
  pattern: string;
  flags?: string | undefined;
  suggestion: string;
  comment?: string | null;
};

export type PromptAutofixOperation =
  | {
      kind: 'replace';
      pattern: string;
      flags?: string | undefined;
      replacement: string;
      comment?: string | null;
    }
  | {
      kind: 'params_json';
      comment?: string | null;
    };

export type PromptAutofixConfig = {
  enabled: boolean;
  operations: PromptAutofixOperation[];
};

export type PromptValidationRule =
  | {
      kind: 'regex';
      id: string;
      enabled: boolean;
      severity: PromptValidationSeverity;
      title: string;
      description: string | null;
      pattern: string;
      flags: string;
      message: string;
      similar: PromptValidationSimilarPattern[];
      autofix?: PromptAutofixConfig | undefined;
      sequenceGroupId?: string | null;
      sequenceGroupLabel?: string | null;
      sequenceGroupDebounceMs?: number;
      sequence?: number | null;
      chainMode?: PromptValidationChainMode;
      maxExecutions?: number;
      passOutputToNext?: boolean;
      launchEnabled?: boolean;
      launchOperator?: PromptValidationLaunchOperator;
      launchValue?: string | null;
      launchFlags?: string | null;
    }
  | {
      kind: 'params_object';
      id: string;
      enabled: boolean;
      severity: PromptValidationSeverity;
      title: string;
      description: string | null;
      message: string;
      similar: PromptValidationSimilarPattern[];
      autofix?: PromptAutofixConfig | undefined;
      sequenceGroupId?: string | null;
      sequenceGroupLabel?: string | null;
      sequenceGroupDebounceMs?: number;
      sequence?: number | null;
      chainMode?: PromptValidationChainMode;
      maxExecutions?: number;
      passOutputToNext?: boolean;
      launchEnabled?: boolean;
      launchOperator?: PromptValidationLaunchOperator;
      launchValue?: string | null;
      launchFlags?: string | null;
    };

export type PromptValidationSettings = {
  enabled: boolean;
  rules: PromptValidationRule[];
  learnedRules?: PromptValidationRule[];
};

export type PromptEngineSettings = {
  version: 1;
  promptValidation: PromptValidationSettings;
};

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
];

export const defaultPromptEngineSettings: PromptEngineSettings = {
  version: 1,
  promptValidation: {
    enabled: true,
    rules: defaultPromptValidationRules,
    learnedRules: [],
  },
};

const promptValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
const promptValidationChainModeSchema = z.enum(['continue', 'stop_on_match', 'stop_on_replace']);
const promptValidationLaunchOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
]);
const promptValidationSimilarSchema: z.ZodType<PromptValidationSimilarPattern> = z
  .object({
    pattern: z.string().trim().min(1),
    flags: z.string().trim().optional(),
    suggestion: z.string().trim().min(1),
    comment: z.string().trim().min(1).nullable().optional().default(null),
  })
  .strict();

const promptAutofixOperationSchema: z.ZodType<PromptAutofixOperation> = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('replace'),
      pattern: z.string().trim().min(1),
      flags: z.string().trim().optional(),
      replacement: z.string(),
      comment: z.string().trim().min(1).nullable().optional().default(null),
    })
    .strict(),
  z
    .object({
      kind: z.literal('params_json'),
      comment: z.string().trim().min(1).nullable().optional().default(null),
    })
    .strict(),
]);

const promptAutofixSchema: z.ZodType<PromptAutofixConfig> = z
  .object({
    enabled: z.boolean().optional().default(true),
    operations: z.array(promptAutofixOperationSchema).optional().default([]),
  })
  .strict();

const promptValidationSequenceFieldsSchema = z
  .object({
    sequenceGroupId: z.string().trim().min(1).nullable().optional().default(null),
    sequenceGroupLabel: z.string().trim().min(1).nullable().optional().default(null),
    sequenceGroupDebounceMs: z.number().int().min(0).max(30000).optional().default(0),
    sequence: z.number().int().nullable().optional().default(null),
    chainMode: promptValidationChainModeSchema.optional().default('continue'),
    maxExecutions: z.number().int().min(1).max(20).optional().default(1),
    passOutputToNext: z.boolean().optional().default(true),
    launchEnabled: z.boolean().optional().default(false),
    launchOperator: promptValidationLaunchOperatorSchema.optional().default('contains'),
    launchValue: z.string().nullable().optional().default(null),
    launchFlags: z.string().trim().nullable().optional().default(null),
  })
  .strict();

const promptValidationRuleSchema: z.ZodType<PromptValidationRule> = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('regex'),
      id: z.string().trim().min(1),
      enabled: z.boolean().optional().default(true),
      severity: promptValidationSeveritySchema.optional().default('warning'),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1).nullable().optional().default(null),
      pattern: z.string().trim().min(1),
      flags: z.string().trim().optional().default('mi'),
      message: z.string().trim().min(1),
      similar: z.array(promptValidationSimilarSchema).optional().default([]),
      autofix: promptAutofixSchema.optional().default({ enabled: true, operations: [] }),
    })
    .merge(promptValidationSequenceFieldsSchema)
    .strict(),
  z
    .object({
      kind: z.literal('params_object'),
      id: z.string().trim().min(1),
      enabled: z.boolean().optional().default(true),
      severity: promptValidationSeveritySchema.optional().default('error'),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1).nullable().optional().default(null),
      message: z.string().trim().min(1),
      similar: z.array(promptValidationSimilarSchema).optional().default([]),
      autofix: promptAutofixSchema.optional().default({ enabled: true, operations: [] }),
    })
    .merge(promptValidationSequenceFieldsSchema)
    .strict(),
]);

const promptValidationSettingsSchema: z.ZodType<PromptValidationSettings> = z
  .object({
    enabled: z.boolean().optional().default(defaultPromptEngineSettings.promptValidation.enabled),
    rules: z.array(promptValidationRuleSchema).optional().default(defaultPromptEngineSettings.promptValidation.rules),
    learnedRules: z.array(promptValidationRuleSchema).optional().default([]),
  })
  .strict();

const promptEngineSettingsSchema: z.ZodType<PromptEngineSettings> = z
  .object({
    version: z.literal(1).optional().default(1),
    promptValidation: promptValidationSettingsSchema.optional().default(defaultPromptEngineSettings.promptValidation),
  })
  .strict();

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

    if (hadAutofixInStorage) return result.data;

    const defaultById = new Map(defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule]));
    const mergedRules = result.data.promptValidation.rules.map((rule: PromptValidationRule) => {
      const defaults = defaultById.get(rule.id);
      if (!defaults?.autofix || defaults.autofix.operations.length === 0) return rule;
      const needsAutofix =
        !rule.autofix ||
        !Array.isArray(rule.autofix.operations) ||
        rule.autofix.operations.length === 0;
      return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
    });

    return {
      ...result.data,
      promptValidation: {
        ...result.data.promptValidation,
        rules: mergedRules,
        learnedRules: result.data.promptValidation.learnedRules ?? [],
      },
    };
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
