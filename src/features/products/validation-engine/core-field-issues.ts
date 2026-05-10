import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  FieldValidatorIssue,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationTarget,
} from '@/shared/contracts/products/validation';

import {
  createFieldIssue,
  resolveReplacementContext,
  shouldEmitIssue,
  type PatternMatchContext,
} from './core-field-replacement';
import {
  appendSequenceIssues,
  ensureSequenceAggregate,
  updateSequenceAggregate,
} from './core-field-sequence';
import { shouldLaunchPattern } from './core-launch-replacement';
import {
  buildSequenceGroupCounts,
  hasPatternReplacementValue,
  isPatternLocaleMatch,
  resolveFieldTargetAndLocale,
  sortValidatorPatterns,
} from './core-normalization';
import { compileValidationPatternRegex } from './core-regex';
import { buildStaticPatternPlans } from './core-static-plans';
import type { SequenceIssueAggregate, StaticPatternPlan } from './core-types';

type ApplyPatternPlansArgs = {
  fieldName: string;
  normalizedRawValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  fieldPlans: StaticPatternPlan[];
  categories?: ReadonlyArray<ProductCategory>;
};

type PatternExecutionState = {
  candidateValue: string;
  issues: FieldValidatorIssue[];
  matched: boolean;
  replaced: boolean;
  workingValue: string;
};

const resolveMatchLength = (matchText: string, candidateValue: string): number =>
  Math.max(1, matchText.length, candidateValue.length);

const resolveFallbackMatchContext = (candidateValue: string): PatternMatchContext => ({
  matchText: candidateValue,
  matchIndex: 0,
  length: resolveMatchLength('', candidateValue),
});

const resolveMatchContext = (
  match: RegExpExecArray | null,
  candidateValue: string,
  allowWithoutRegexMatch: boolean
): PatternMatchContext | null => {
  if (match !== null) {
    return {
      matchText: match[0],
      matchIndex: match.index,
      length: resolveMatchLength(match[0], candidateValue),
    };
  }
  if (!allowWithoutRegexMatch) return null;
  return resolveFallbackMatchContext(candidateValue);
};

const runPlanExecution = (
  args: Omit<ApplyPatternPlansArgs, 'fieldPlans' | 'normalizedRawValue'> & {
    aggregates: Map<string, SequenceIssueAggregate>;
    plan: StaticPatternPlan;
    regex: RegExp;
    state: PatternExecutionState;
  }
): { shouldContinue: boolean; state: PatternExecutionState } => {
  const { aggregates, categories, fieldName, latestProductValues, plan, regex, state } = args;
  regex.lastIndex = 0;
  const match = resolveMatchContext(
    regex.exec(state.candidateValue),
    state.candidateValue,
    plan.allowWithoutRegexMatch
  );
  if (match === null) return { shouldContinue: false, state };
  const replacement = resolveReplacementContext({
    categories,
    candidateValue: state.candidateValue,
    fieldName,
    latestProductValues,
    pattern: plan.pattern,
    plan,
    validationScope: args.validationScope,
    values: args.values,
  });
  const issues = shouldEmitIssue(plan, replacement)
    ? [...state.issues, createFieldIssue({ match, plan, replacement })]
    : state.issues;
  if (
    replacement.shouldSuppressUnresolvableCategoryProposal ||
    !replacement.hasEffectiveReplacement ||
    replacement.isNoopReplacement
  ) {
    return { shouldContinue: false, state: { ...state, issues, matched: true } };
  }
  updateSequenceAggregate(aggregates, plan, replacement.nextValue);
  return {
    shouldContinue: true,
    state: {
      candidateValue: replacement.nextValue,
      issues,
      matched: true,
      replaced: true,
      workingValue: plan.inSequenceGroup ? replacement.nextValue : state.workingValue,
    },
  };
};

const shouldRunPlanExecution = (
  args: Omit<ApplyPatternPlansArgs, 'fieldPlans' | 'normalizedRawValue'> & {
    candidateValue: string;
    plan: StaticPatternPlan;
  }
): boolean =>
  shouldLaunchPattern({
    pattern: args.plan.pattern,
    validationScope: args.validationScope,
    fieldValue: args.candidateValue,
    values: args.values,
    latestProductValues: args.latestProductValues,
  });

const applyPlanExecutions = (
  args: Omit<ApplyPatternPlansArgs, 'fieldPlans' | 'normalizedRawValue'> & {
    aggregates: Map<string, SequenceIssueAggregate>;
    initialValue: string;
    plan: StaticPatternPlan;
    regex: RegExp;
    workingValue: string;
  }
): PatternExecutionState => {
  let state: PatternExecutionState = {
    candidateValue: args.initialValue,
    issues: [],
    matched: false,
    replaced: false,
    workingValue: args.workingValue,
  };
  for (let execution = 0; execution < args.plan.maxExecutions; execution += 1) {
    if (!shouldRunPlanExecution({ ...args, candidateValue: state.candidateValue })) break;
    const result = runPlanExecution({ ...args, state });
    state = result.state;
    if (!result.shouldContinue) break;
  }
  return state;
};

const shouldStopAfterPlan = (plan: StaticPatternPlan, result: PatternExecutionState): boolean => {
  if (!plan.inSequenceGroup) return false;
  if (result.matched && plan.chainMode === 'stop_on_match') return true;
  if (result.replaced && plan.chainMode === 'stop_on_replace') return true;
  return result.replaced && plan.pattern.passOutputToNext === false;
};

const applyPatternPlan = ({
  categories,
  fieldName,
  latestProductValues,
  normalizedRawValue,
  plan,
  sequenceAggregates,
  validationScope,
  values,
  workingValue,
}: Omit<ApplyPatternPlansArgs, 'fieldPlans'> & {
  plan: StaticPatternPlan;
  sequenceAggregates: Map<string, SequenceIssueAggregate>;
  workingValue: string;
}): PatternExecutionState | null => {
  ensureSequenceAggregate(sequenceAggregates, plan, workingValue);
  const regex = compileValidationPatternRegex(plan.pattern);
  if (regex === null) return null;
  return applyPlanExecutions({
    categories,
    fieldName,
    values,
    latestProductValues,
    validationScope,
    aggregates: sequenceAggregates,
    initialValue: plan.inSequenceGroup ? workingValue : normalizedRawValue,
    plan,
    regex,
    workingValue,
  });
};

const applyPatternPlansToField = ({
  fieldName,
  normalizedRawValue,
  values,
  latestProductValues,
  validationScope,
  fieldPlans,
  categories,
}: ApplyPatternPlansArgs): FieldValidatorIssue[] => {
  let issues: FieldValidatorIssue[] = [];
  let workingValue = normalizedRawValue;
  const sequenceAggregates = new Map<string, SequenceIssueAggregate>();
  for (const plan of fieldPlans) {
    const result = applyPatternPlan({
      fieldName,
      normalizedRawValue,
      values,
      latestProductValues,
      validationScope,
      categories,
      plan,
      sequenceAggregates,
      workingValue,
    });
    if (result === null) continue;
    issues = [...issues, ...result.issues];
    workingValue = result.workingValue;
    if (shouldStopAfterPlan(plan, result)) break;
  }
  return appendSequenceIssues(issues, sequenceAggregates);
};

const planHasExternalLaunchSource = (plan: StaticPatternPlan): boolean =>
  plan.pattern.launchEnabled === true && plan.pattern.launchSourceMode !== 'current_field';

const planRegexMatchesEmptyValue = (plan: StaticPatternPlan): boolean =>
  compileValidationPatternRegex(plan.pattern)?.test('') === true;

const planCanEvaluateEmptyValue = (plan: StaticPatternPlan): boolean => {
  if (plan.allowWithoutRegexMatch) return true;
  if (planHasExternalLaunchSource(plan)) return true;
  if (!hasPatternReplacementValue(plan.pattern)) return false;
  return planRegexMatchesEmptyValue(plan);
};

const canFieldPlansEvaluateEmptyValue = (fieldPlans: StaticPatternPlan[]): boolean =>
  fieldPlans.some(planCanEvaluateEmptyValue);

const normalizeRawFieldValue = (rawValue: unknown): string => {
  if (typeof rawValue === 'string') return rawValue;
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return String(rawValue);
  return '';
};

const resolveFieldPlans = (
  fieldName: string,
  staticPatternsByTarget: Map<ProductValidationTarget, StaticPatternPlan[]>
): StaticPatternPlan[] => {
  const { target, locale } = resolveFieldTargetAndLocale(fieldName);
  if (target === null) return [];
  const targetPlans = staticPatternsByTarget.get(target) ?? [];
  return targetPlans.filter((plan) => isPatternLocaleMatch(plan.pattern.locale, locale));
};

const shouldSkipEmptyFieldValue = (
  normalizedRawValue: string,
  fieldPlans: StaticPatternPlan[]
): boolean => {
  if (normalizedRawValue.length > 0) return false;
  return !canFieldPlansEvaluateEmptyValue(fieldPlans);
};

export const buildFieldIssues = ({
  values,
  patterns,
  latestProductValues,
  validationScope,
  categories,
}: {
  values: Record<string, unknown>;
  patterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  categories?: ReadonlyArray<ProductCategory>;
}): Record<string, FieldValidatorIssue[]> => {
  const issues: Record<string, FieldValidatorIssue[]> = {};
  const entries = Object.entries(values);
  if (entries.length === 0 || patterns.length === 0) return issues;
  const orderedPatterns = sortValidatorPatterns(patterns);
  const staticPatternsByTarget = buildStaticPatternPlans({
    orderedPatterns,
    validationScope,
    sequenceGroupCounts: buildSequenceGroupCounts(orderedPatterns),
  });
  for (const [fieldName, rawValue] of entries) {
    const normalizedRawValue = normalizeRawFieldValue(rawValue);
    const fieldPlans = resolveFieldPlans(fieldName, staticPatternsByTarget);
    if (fieldPlans.length === 0 || shouldSkipEmptyFieldValue(normalizedRawValue, fieldPlans)) {
      continue;
    }
    const fieldIssues = applyPatternPlansToField({
      fieldName,
      normalizedRawValue,
      values,
      latestProductValues,
      validationScope,
      fieldPlans,
      categories,
    });
    if (fieldIssues.length > 0) issues[fieldName] = fieldIssues;
  }
  return issues;
};
