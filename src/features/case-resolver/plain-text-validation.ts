import { type ValidatorPatternList } from '@/shared/contracts/admin';
import { formatProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import {
  preparePromptValidationRuntime,
  validateProgrammaticPromptWithRuntime,
} from '@/shared/lib/prompt-engine';
import { type CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import type {
  PromptEngineSettings,
  PromptValidationRule,
  PromptValidationScope,
} from '@/shared/contracts/prompt-engine';

export const CASE_RESOLVER_PLAIN_TEXT_VALIDATOR_SCOPE = 'case-resolver-plain-text' as const;
export const CASE_RESOLVER_PLAIN_TEXT_PROMPT_SCOPE = 'case_resolver_plain_text' as const;

const normalizePromptValidationScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return ['global'];
  }
  const deduped: PromptValidationScope[] = [];
  scopes.forEach((scope: PromptValidationScope): void => {
    if (deduped.includes(scope)) return;
    deduped.push(scope);
  });
  return deduped;
};

const ruleAppliesToScope = (rule: PromptValidationRule, scope: PromptValidationScope): boolean => {
  const appliesToScopes = normalizePromptValidationScopes(rule.appliesToScopes);
  return appliesToScopes.includes(scope) || appliesToScopes.includes('global');
};

const resolveScopedRules = (
  settings: PromptEngineSettings
): {
  rules: PromptValidationRule[];
  learnedRules: PromptValidationRule[];
} => {
  const rules = (settings.promptValidation.rules ?? []).filter(
    (rule: PromptValidationRule): boolean =>
      ruleAppliesToScope(rule, CASE_RESOLVER_PLAIN_TEXT_PROMPT_SCOPE)
  );
  const learnedRules = (settings.promptValidation.learnedRules ?? []).filter(
    (rule: PromptValidationRule): boolean =>
      ruleAppliesToScope(rule, CASE_RESOLVER_PLAIN_TEXT_PROMPT_SCOPE)
  );
  return { rules, learnedRules };
};

export const listCaseResolverPlainTextStacks = (
  patternLists: ValidatorPatternList[]
): ValidatorPatternList[] =>
  patternLists.filter(
    (entry: ValidatorPatternList): boolean =>
      entry.scope === CASE_RESOLVER_PLAIN_TEXT_VALIDATOR_SCOPE
  );

export const resolveCaseResolverPlainTextDefaultStackId = (
  patternLists: ValidatorPatternList[]
): string => listCaseResolverPlainTextStacks(patternLists)[0]?.id ?? '';

type ApplyCaseResolverPlainTextValidationArgs = {
  input: string;
  nodeMeta: CaseResolverNodeMeta;
  promptEngineSettings: PromptEngineSettings;
  patternLists: ValidatorPatternList[];
  forceEnabled?: boolean;
  forceFormatterEnabled?: boolean;
};

export const applyCaseResolverPlainTextValidation = (
  args: ApplyCaseResolverPlainTextValidationArgs
): string => {
  const sourceText = typeof args.input === 'string' ? args.input : '';
  if (!sourceText) return sourceText;
  const validationEnabled = args.forceEnabled ?? args.nodeMeta.plainTextValidationEnabled ?? true;
  if (!validationEnabled) return sourceText;

  const formatterEnabled =
    args.forceFormatterEnabled ?? args.nodeMeta.plainTextFormatterEnabled ?? true;
  const stackOptions = listCaseResolverPlainTextStacks(args.patternLists);
  const stackId = args.nodeMeta.plainTextValidationStackId?.trim() ?? '';
  const hasValidStack =
    stackId.length > 0 &&
    stackOptions.some((stack: ValidatorPatternList): boolean => stack.id === stackId);
  if (stackOptions.length > 0 && !hasValidStack) {
    const fallbackStackId = stackOptions[0]?.id?.trim() ?? '';
    if (!fallbackStackId) return sourceText;
  }

  const scopedRules = resolveScopedRules(args.promptEngineSettings);
  if (scopedRules.rules.length === 0 && scopedRules.learnedRules.length === 0) {
    return sourceText;
  }

  const validationSettings = {
    enabled: true,
    rules: scopedRules.rules,
    learnedRules: scopedRules.learnedRules,
  };
  const runtime = preparePromptValidationRuntime(validationSettings, {
    scope: CASE_RESOLVER_PLAIN_TEXT_PROMPT_SCOPE,
  });
  const issuesBefore = validateProgrammaticPromptWithRuntime(sourceText, runtime);
  if (!formatterEnabled || issuesBefore.length === 0) {
    return sourceText;
  }
  const formatted = formatProgrammaticPrompt(
    sourceText,
    validationSettings,
    { scope: CASE_RESOLVER_PLAIN_TEXT_PROMPT_SCOPE },
    {
      preparedRuntime: runtime,
      precomputedIssuesBefore: issuesBefore,
      enableIncrementalValidation: true,
    }
  );
  return formatted.prompt;
};
