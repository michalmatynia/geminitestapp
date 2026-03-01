import { formatProgrammaticPrompt } from '@/shared/lib/prompt-engine';
import {
  preparePromptValidationRuntime,
  validateProgrammaticPromptWithRuntime,
} from '@/shared/lib/prompt-engine';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type {
  PromptAppliedFixDto,
  PromptValidationIssueDto,
  PromptValidationRuleDto,
  PromptValidationScopeDto,
} from '@/shared/contracts/prompt-engine';
import {
  coerceInput,
  getValueAtMappingPath,
  normalizeMappingPath,
  safeStringify,
} from '../../../utils';

export const handleValidator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs['context']) as Record<string, unknown> | undefined;
  if (!contextValue) {
    return {};
  }
  const validatorConfig = node.config?.validator ?? {
    requiredPaths: ['entity.id'],
    mode: 'all',
  };
  const required = (validatorConfig.requiredPaths ?? []).map((path: string): string | null =>
    normalizeMappingPath(path, contextValue)
  );
  const missing = required.filter((path: string | null): boolean => {
    if (!path) return false;
    const value = getValueAtMappingPath(contextValue, path);
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });
  const valid =
    validatorConfig.mode === 'any' ? missing.length < required.length : missing.length === 0;
  return {
    context: contextValue,
    valid,
    errors: missing as string[],
  };
};

type ValidationPatternIssue = PromptValidationIssueDto;
type ValidationPatternRule = PromptValidationRuleDto;

const VALIDATION_PATTERN_DEFAULTS = {
  source: 'global_stack',
  stackId: '',
  scope: 'global',
  includeLearnedRules: true,
  runtimeMode: 'validate_only',
  failPolicy: 'block_on_error',
  inputPort: 'auto',
  outputPort: 'value',
  maxAutofixPasses: 1,
  includeRuleIds: [] as string[],
  localListName: 'Path Local Validation List',
  localListDescription: '',
  rules: [] as ValidationPatternRule[],
  learnedRules: [] as ValidationPatternRule[],
} as const;

const coerceValidationPatternText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return safeStringify(value);
  const record = value as Record<string, unknown>;
  const preferredText =
    record['text'] ??
    record['prompt'] ??
    record['value'] ??
    record['result'] ??
    record['content'] ??
    record['content_en'];
  if (typeof preferredText === 'string') return preferredText;
  if (typeof preferredText === 'number' || typeof preferredText === 'boolean') {
    return String(preferredText);
  }
  return safeStringify(value);
};

const resolveValidationPatternInput = (
  configuredPort: string | undefined,
  nodeInputs: RuntimePortValues
): { sourcePort: string; rawValue: unknown; text: string } => {
  const explicitPort = (configuredPort ?? 'auto').trim();
  const portOrder =
    explicitPort === 'auto'
      ? ['value', 'prompt', 'result', 'context']
      : [explicitPort, 'value', 'prompt', 'result', 'context'];
  for (const port of portOrder) {
    const rawValue = coerceInput(nodeInputs[port]);
    if (rawValue === undefined || rawValue === null) continue;
    return {
      sourcePort: port,
      rawValue,
      text: coerceValidationPatternText(rawValue),
    };
  }
  return {
    sourcePort: explicitPort === 'auto' ? 'value' : explicitPort,
    rawValue: undefined,
    text: '',
  };
};

const normalizeValidationPatternRules = (
  rules: ValidationPatternRule[] | undefined,
  includeRuleIds: Set<string> | null
): ValidationPatternRule[] => {
  if (!Array.isArray(rules) || rules.length === 0) return [];
  if (!includeRuleIds || includeRuleIds.size === 0) return rules;
  return rules.filter((rule: ValidationPatternRule): boolean => includeRuleIds.has(rule.id));
};

const summarizeValidationIssues = (issues: ValidationPatternIssue[]): string[] =>
  issues.map(
    (issue: ValidationPatternIssue): string =>
      `[${issue.severity}] ${issue.title}: ${issue.message}`
  );

const buildValidationPatternOutputPorts = (args: {
  outputPort: 'value' | 'result';
  inputText: string;
  outputText: string;
}): { value: string; result: string } => {
  const preferred =
    args.outputPort === 'result'
      ? { value: args.inputText, result: args.outputText }
      : { value: args.outputText, result: args.inputText };
  return preferred;
};

export const handleValidationPattern: NodeHandler = ({
  node,
  nodeInputs,
  reportAiPathsError,
}: NodeHandlerContext): RuntimePortValues => {
  const config = {
    ...VALIDATION_PATTERN_DEFAULTS,
    ...(node.config?.validationPattern ?? {}),
  };
  const resolvedInput = resolveValidationPatternInput(config.inputPort, nodeInputs);
  const sourceText = resolvedInput.text;
  const contextValue = coerceInput(nodeInputs['context']);

  if (sourceText.trim().length === 0) {
    const outputs = buildValidationPatternOutputPorts({
      outputPort: config.outputPort as 'value' | 'result',
      inputText: sourceText,
      outputText: sourceText,
    });
    return {
      ...outputs,
      ...(contextValue !== undefined ? { context: contextValue } : {}),
      valid: true,
      errors: [],
      bundle: {
        skipped: true,
        reason: 'empty_input',
        sourcePort: resolvedInput.sourcePort,
      },
    };
  }

  const includeRuleIds = (config.includeRuleIds ?? [])
    .map((value: string): string => value.trim())
    .filter(Boolean);
  const includeRuleIdSet = includeRuleIds.length > 0 ? new Set<string>(includeRuleIds) : null;
  const runtimeRules = normalizeValidationPatternRules(
    config.rules as ValidationPatternRule[],
    includeRuleIdSet
  );
  const runtimeLearnedRules =
    config.includeLearnedRules === false
      ? []
      : normalizeValidationPatternRules(
          config.learnedRules as ValidationPatternRule[],
          includeRuleIdSet
      );

  if (runtimeRules.length === 0 && runtimeLearnedRules.length === 0) {
    const outputs = buildValidationPatternOutputPorts({
      outputPort: config.outputPort as 'value' | 'result',
      inputText: sourceText,
      outputText: sourceText,
    });
    return {
      ...outputs,
      ...(contextValue !== undefined ? { context: contextValue } : {}),
      valid: true,
      errors: [],
      bundle: {
        skipped: true,
        reason: 'no_rules_configured',
        source: config.source,
        stackId: config.stackId,
        scope: config.scope,
      },
    };
  }

  const validationSettings = {
    enabled: true,
    rules: runtimeRules,
    learnedRules: runtimeLearnedRules,
  };
  const scope: PromptValidationScopeDto = (config.scope as PromptValidationScopeDto) ?? 'global';
  const runtime = preparePromptValidationRuntime(validationSettings, { scope });

  try {
    let workingText = sourceText;
    let issues = validateProgrammaticPromptWithRuntime(workingText, runtime);
    const appliedFixes: PromptAppliedFixDto[] = [];
    const maxAutofixPasses = Math.max(
      1,
      Math.min(
        10,
        typeof config.maxAutofixPasses === 'number' && Number.isFinite(config.maxAutofixPasses)
          ? Math.trunc(config.maxAutofixPasses)
          : 1
      )
    );
    if (config.runtimeMode === 'validate_and_autofix' && issues.length > 0) {
      for (let pass = 0; pass < maxAutofixPasses; pass += 1) {
        const formatted = formatProgrammaticPrompt(
          workingText,
          validationSettings,
          { scope },
          {
            preparedRuntime: runtime,
            precomputedIssuesBefore: issues,
            enableIncrementalValidation: true,
          }
        );
        if (!formatted.changed) break;
        workingText = formatted.prompt;
        if (formatted.applied.length > 0) {
          appliedFixes.push(...formatted.applied);
        }
        issues = validateProgrammaticPromptWithRuntime(workingText, runtime);
        if (issues.length === 0) break;
      }
    }

    const blockingIssueCount = issues.filter(
      (issue: ValidationPatternIssue): boolean => issue.severity === 'error'
    ).length;
    const warningIssueCount = issues.filter(
      (issue: ValidationPatternIssue): boolean => issue.severity === 'warning'
    ).length;
    const valid = config.failPolicy === 'report_only' ? true : blockingIssueCount === 0;
    const errors = summarizeValidationIssues(issues);
    const outputs = buildValidationPatternOutputPorts({
      outputPort: config.outputPort as 'value' | 'result',
      inputText: sourceText,
      outputText: workingText,
    });

    return {
      ...outputs,
      ...(contextValue !== undefined ? { context: contextValue } : {}),
      valid,
      errors,
      bundle: {
        sourcePort: resolvedInput.sourcePort,
        source: config.source,
        stackId: config.stackId,
        scope,
        runtimeMode: config.runtimeMode,
        failPolicy: config.failPolicy,
        issueCount: issues.length,
        blockingIssueCount,
        warningIssueCount,
        appliedFixes,
        issues,
        input: sourceText,
        output: workingText,
      },
    };
  } catch (error) {
    reportAiPathsError(
      error,
      {
        service: 'ai-paths-runtime',
        nodeId: node.id,
        nodeType: node.type,
      },
      `Node ${node.id} failed`
    );
    const outputs = buildValidationPatternOutputPorts({
      outputPort: config.outputPort as 'value' | 'result',
      inputText: sourceText,
      outputText: sourceText,
    });
    return {
      ...outputs,
      ...(contextValue !== undefined ? { context: contextValue } : {}),
      valid: false,
      errors: ['Validation Pattern runtime failed.'],
      bundle: {
        sourcePort: resolvedInput.sourcePort,
        source: config.source,
        stackId: config.stackId,
        scope,
        runtimeMode: config.runtimeMode,
        failPolicy: config.failPolicy,
        issueCount: 0,
        blockingIssueCount: 0,
        warningIssueCount: 0,
        appliedFixes: [],
        issues: [],
        input: sourceText,
        output: sourceText,
      },
    };
  }
};
