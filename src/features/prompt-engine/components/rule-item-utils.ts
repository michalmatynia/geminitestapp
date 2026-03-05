import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  PROMPT_EXPLODER_RULE_SEGMENT_TYPE_VALUES,
  PROMPT_VALIDATION_SCOPE_LABELS,
  PROMPT_VALIDATION_SCOPE_VALUES,
  type PromptAutofixOperation,
  type PromptExploderRuleSegmentType,
  type PromptValidationRule,
  type PromptValidationScope,
  type PromptValidationSeverity,
  type PromptValidationLaunchOperator,
} from '@/shared/lib/prompt-engine/settings';

export const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

export const getSeverityBadgeClasses = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
};

export const compileRegex = (
  pattern: string,
  flags: string | undefined
): { ok: true } | { ok: false; error: string } => {
  try {
    void new RegExp(pattern, flags);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid regex' };
  }
};

export const formatAutofixOperation = (op: PromptAutofixOperation): string => {
  if (op.kind === 'params_json') return 'Convert `params` object to strict JSON';
  const flags = op.flags?.trim() ? `/${op.flags.trim()}` : '';
  return `Replace ${op.pattern}${flags} → ${op.replacement}`;
};

export const LAUNCH_OPERATORS: Array<{
  value: PromptValidationLaunchOperator;
  label: string;
}> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'regex', label: 'Regex' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export const SCOPE_OPTIONS = PROMPT_VALIDATION_SCOPE_VALUES.map((scope) => ({
  value: scope,
  label: PROMPT_VALIDATION_SCOPE_LABELS[scope],
}));

export const PROMPT_EXPLODER_SEGMENT_OPTIONS: Array<{
  value: PromptExploderRuleSegmentType;
  label: string;
}> = PROMPT_EXPLODER_RULE_SEGMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: type.replaceAll('_', ' '),
}));

export const normalizeRuleScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  }
  const known = new Set<PromptValidationScope>(PROMPT_VALIDATION_SCOPE_VALUES);
  const deduped: PromptValidationScope[] = [];
  for (const scope of scopes) {
    if (!known.has(scope) || deduped.includes(scope)) continue;
    deduped.push(scope);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_PROMPT_VALIDATION_SCOPES];
};

const IMAGE_STUDIO_SCOPE_SET = new Set<PromptValidationScope>([
  'image_studio_prompt',
  'image_studio_extraction',
  'image_studio_generation',
]);

const hasOnlyImageStudioScopes = (scopes: PromptValidationScope[]): boolean =>
  scopes.some((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope)) &&
  scopes.every((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope) || scope === 'global');

export const isImageStudioRuleFromScopes = (
  rule: PromptValidationRule | null,
  appliesToScopes: PromptValidationScope[],
  launchAppliesToScopes: PromptValidationScope[]
): boolean =>
  Boolean(
    rule &&
    (rule.id.toLowerCase().includes('image_studio') ||
      rule.id.toLowerCase().includes('image-studio') ||
      hasOnlyImageStudioScopes(appliesToScopes) ||
      hasOnlyImageStudioScopes(launchAppliesToScopes))
  );

export const normalizeRuleKind = (value: string): PromptValidationRule['kind'] =>
  value === 'params_object' ? 'params_object' : 'regex';
