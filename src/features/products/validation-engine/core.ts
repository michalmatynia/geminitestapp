import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
  ProductValidationTarget,
  FieldValidatorIssue,
} from '@/shared/contracts/products';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';
import {
  isPatternEnabledForValidationScope,
  isPatternLaunchEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  evaluateDynamicReplacementRecipe,
  evaluateStringCondition,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type { FieldValidatorIssue };

type SequenceIssueAggregate = {
  groupId: string;
  groupLabel: string | null;
  originalValue: string;
  finalValue: string;
  severity: FieldValidatorIssue['severity'];
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

type ResolvedReplacement = {
  value: string;
  kind: 'static' | 'dynamic';
  applyMode: 'replace_whole_field' | 'replace_matched_segment';
} | null;

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizevalidationdebouncems
 */
export const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizepostacceptbehavior
 */
export const normalizePostAcceptBehavior = (value: unknown): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizepatternsequence
 */
export const normalizePatternSequence = (
  pattern: ProductValidationPattern,
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizepatternchainmode
 */
export const normalizePatternChainMode = (
  pattern: ProductValidationPattern
): 'continue' | 'stop_on_match' | 'stop_on_replace' => {
  if (pattern.chainMode === 'stop_on_match' || pattern.chainMode === 'stop_on_replace') {
    return pattern.chainMode;
  }
  return 'continue';
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizepatternmaxexecutions
 */
export const normalizePatternMaxExecutions = (pattern: ProductValidationPattern): number => {
  if (typeof pattern.maxExecutions !== 'number' || !Number.isFinite(pattern.maxExecutions)) {
    return 1;
  }
  return Math.min(20, Math.max(1, Math.floor(pattern.maxExecutions)));
};

const getSequenceScopeKey = (pattern: ProductValidationPattern): string | null => {
  const groupId = pattern.sequenceGroupId?.trim();
  if (!groupId) return null;
  const normalizedLocale = pattern.locale?.trim().toLowerCase() ?? '*';
  return `${groupId}::${pattern.target}::${normalizedLocale}`;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.buildsequencegroupcounts
 */
export const buildSequenceGroupCounts = (
  patterns: ProductValidationPattern[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;
    const scopeKey = getSequenceScopeKey(pattern);
    if (!scopeKey) continue;
    counts.set(scopeKey, (counts.get(scopeKey) ?? 0) + 1);
  }
  return counts;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.ispatterninsequencegroup
 */
export const isPatternInSequenceGroup = (
  pattern: ProductValidationPattern,
  counts: Map<string, number>
): boolean => {
  const scopeKey = getSequenceScopeKey(pattern);
  if (!scopeKey) return false;
  return (counts.get(scopeKey) ?? 0) > 1;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.sortvalidatorpatterns
 */
export const sortValidatorPatterns = (
  patterns: ProductValidationPattern[]
): ProductValidationPattern[] =>
  patterns
    .map((pattern: ProductValidationPattern, index: number) => ({ pattern, index }))
    .sort((a, b) => {
      const aSeq = normalizePatternSequence(a.pattern, a.index);
      const bSeq = normalizePatternSequence(b.pattern, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      if (a.pattern.target !== b.pattern.target) {
        return a.pattern.target.localeCompare(b.pattern.target);
      }
      return a.pattern.label.localeCompare(b.pattern.label);
    })
    .map((entry) => entry.pattern);

/**
 * Validator docs: see docs/validator/function-reference.md#core.resolvefieldtargetandlocale
 */
export const resolveFieldTargetAndLocale = (
  fieldName: string
): { target: ProductValidationTarget | null; locale: string | null } => {
  let target: ProductValidationTarget | null = null;
  if (fieldName.startsWith('name_')) {
    target = 'name';
  } else if (fieldName.startsWith('description_')) {
    target = 'description';
  } else if (fieldName === 'sku') {
    target = 'sku';
  } else if (fieldName === 'price') {
    target = 'price';
  } else if (fieldName === 'stock') {
    target = 'stock';
  } else if (fieldName === 'categoryId') {
    target = 'category';
  } else if (fieldName === 'sizeLength') {
    target = 'size_length';
  } else if (fieldName === 'sizeWidth') {
    target = 'size_width';
  } else if (fieldName === 'length') {
    target = 'length';
  } else if (fieldName === 'weight') {
    target = 'weight';
  }
  const localeMatch = /_(en|pl|de)$/i.exec(fieldName);
  const locale = localeMatch?.[1]?.toLowerCase() ?? null;
  return { target, locale };
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.ispatternlocalematch
 */
export const isPatternLocaleMatch = (
  patternLocale: string | null,
  fieldLocale: string | null
): boolean => {
  if (!patternLocale) return true;
  if (!fieldLocale) return false;
  return patternLocale.toLowerCase() === fieldLocale.toLowerCase();
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.normalizereplacementfields
 */
export const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.isreplacementallowedforfield
 */
export const isReplacementAllowedForField = (
  pattern: ProductValidationPattern,
  fieldName: string
): boolean => {
  const replacementFields = normalizeReplacementFields(pattern.replacementFields);
  if (replacementFields.length === 0) return true;
  return replacementFields.includes(fieldName);
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.islatestpricestockmirrorpattern
 */
export const isLatestPriceStockMirrorPattern = (pattern: ProductValidationPattern): boolean => {
  if (pattern.target !== 'price' && pattern.target !== 'stock') return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'latest_product_field' && recipe.targetApply === 'replace_whole_field'
  );
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.isruntimepatternenabled
 */
export const isRuntimePatternEnabled = (pattern: ProductValidationPattern): boolean =>
  Boolean(pattern.runtimeEnabled && pattern.runtimeType !== 'none');

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.resolvepatternlaunchsourcevalue
 */
export const resolvePatternLaunchSourceValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): string => {
  if (!pattern.launchEnabled || pattern.launchSourceMode === 'current_field') {
    return fieldValue;
  }
  if (pattern.launchSourceMode === 'form_field') {
    return toStringValue(values[pattern.launchSourceField ?? '']) ?? '';
  }
  return toStringValue(latestProductValues?.[pattern.launchSourceField ?? '']) ?? '';
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.shouldlaunchpattern
 */
export const shouldLaunchPattern = ({
  pattern,
  validationScope,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): boolean => {
  if (!pattern.launchEnabled) return true;
  if (!isPatternLaunchEnabledForValidationScope(pattern.launchAppliesToScopes, validationScope)) {
    return (
      normalizeProductValidationLaunchScopeBehavior(pattern.launchScopeBehavior) ===
      'condition_only'
    );
  }
  if (pattern.launchSourceMode !== 'current_field' && !pattern.launchSourceField?.trim()) {
    return false;
  }
  const sourceValue = resolvePatternLaunchSourceValue({
    pattern,
    fieldValue,
    values,
    latestProductValues,
  });
  return evaluateStringCondition({
    operator: pattern.launchOperator ?? 'equals',
    value: sourceValue,
    operand: pattern.launchValue ?? null,
    flags: pattern.launchFlags ?? null,
  });
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.resolvepatternreplacementvalue
 */
export const resolvePatternReplacementValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): ResolvedReplacement => {
  if (!pattern.replacementEnabled || !pattern.replacementValue) return null;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) {
    return {
      value: pattern.replacementValue,
      kind: 'static',
      applyMode: 'replace_matched_segment',
    };
  }
  const evaluated = evaluateDynamicReplacementRecipe(recipe, {
    pattern,
    fieldValue,
    formValues: values,
    latestProductValues,
  });
  if (!evaluated) return null;
  return {
    value: evaluated,
    kind: 'dynamic',
    // Dynamic recipe evaluation returns the final target value.
    applyMode: 'replace_whole_field',
  };
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.applyresolvedreplacement
 */
export const applyResolvedReplacement = ({
  value,
  pattern,
  replacement,
}: {
  value: string;
  pattern: ProductValidationPattern;
  replacement: ResolvedReplacement;
}): string => {
  if (!replacement?.value) return value;
  if (replacement.applyMode === 'replace_whole_field') {
    return replacement.value;
  }
  try {
    const flags =
      replacement.kind === 'static'
        ? (pattern.flags ?? '').includes('g')
          ? (pattern.flags ?? undefined)
          : `${pattern.flags ?? ''}g`
        : (pattern.flags ?? undefined);
    const regex = new RegExp(pattern.regex, flags);
    return value.replace(regex, (match: string) =>
      match === replacement.value ? match : replacement.value
    );
  } catch (error) {
    logClientError(error);
    return value;
  }
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.derivediffsegment
 */
export const deriveDiffSegment = (
  before: string,
  after: string
): { index: number; length: number; matchText: string } => {
  if (before === after) {
    const fallback = before.slice(0, 1) || ' ';
    return { index: 0, length: 1, matchText: fallback };
  }

  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }

  let endBefore = before.length - 1;
  let endAfter = after.length - 1;
  while (endBefore >= start && endAfter >= start && before[endBefore] === after[endAfter]) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const removed = before.slice(start, endBefore + 1);
  return {
    index: start,
    length: Math.max(1, removed.length),
    matchText: removed || before.slice(start, start + 1) || ' ',
  };
};

type StaticPatternPlan = {
  pattern: ProductValidationPattern;
  replacementFields: string[];
  debounceMs: number;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  maxExecutions: number;
  chainMode: 'continue' | 'stop_on_match' | 'stop_on_replace';
  inSequenceGroup: boolean;
  sequenceGroupId: string | null;
  allowWithoutRegexMatch: boolean;
};

const buildStaticPatternPlans = ({
  orderedPatterns,
  validationScope,
  sequenceGroupCounts,
}: {
  orderedPatterns: ProductValidationPattern[];
  validationScope: ProductValidationInstanceScope;
  sequenceGroupCounts: Map<string, number>;
}): Map<ProductValidationTarget, StaticPatternPlan[]> => {
  const byTarget = new Map<ProductValidationTarget, StaticPatternPlan[]>();
  for (const pattern of orderedPatterns) {
    if (!pattern.enabled) continue;
    if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) continue;
    if (isRuntimePatternEnabled(pattern)) continue;
    const inSequenceGroup = isPatternInSequenceGroup(pattern, sequenceGroupCounts);
    const nextPlan: StaticPatternPlan = {
      pattern,
      replacementFields: normalizeReplacementFields(pattern.replacementFields),
      debounceMs: normalizeValidationDebounceMs(pattern.validationDebounceMs),
      postAcceptBehavior: normalizePostAcceptBehavior(pattern.postAcceptBehavior),
      maxExecutions: normalizePatternMaxExecutions(pattern),
      chainMode: normalizePatternChainMode(pattern),
      inSequenceGroup,
      sequenceGroupId: inSequenceGroup ? pattern.sequenceGroupId?.trim() || null : null,
      allowWithoutRegexMatch: isLatestPriceStockMirrorPattern(pattern),
    };
    const targetList = byTarget.get(pattern.target);
    if (targetList) {
      targetList.push(nextPlan);
      continue;
    }
    byTarget.set(pattern.target, [nextPlan]);
  }
  return byTarget;
};

function applyPatternPlansToField({
  fieldName,
  normalizedRawValue,
  values,
  latestProductValues,
  validationScope,
  fieldPlans,
}: {
  fieldName: string;
  normalizedRawValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
  fieldPlans: StaticPatternPlan[];
}): FieldValidatorIssue[] {
  const localIssues: FieldValidatorIssue[] = [];
  let workingValue = normalizedRawValue;
  const sequenceAggregates = new Map<string, SequenceIssueAggregate>();

  for (const plan of fieldPlans) {
    const pattern = plan.pattern;
    const inSequenceGroup = plan.inSequenceGroup;
    const sequenceGroupId = plan.sequenceGroupId;
    if (inSequenceGroup && sequenceGroupId && !sequenceAggregates.has(sequenceGroupId)) {
      sequenceAggregates.set(sequenceGroupId, {
        groupId: sequenceGroupId,
        groupLabel: pattern.sequenceGroupLabel?.trim() || null,
        originalValue: workingValue,
        finalValue: workingValue,
        severity: pattern.severity,
        postAcceptBehavior: plan.postAcceptBehavior,
        debounceMs: plan.debounceMs,
      });
    }
    let compiledPatternRegex: RegExp;
    try {
      compiledPatternRegex = new RegExp(pattern.regex, pattern.flags ?? undefined);
    } catch (error) {
      logClientError(error);
      // Invalid pattern is blocked at API write time; skip defensively.
      continue;
    }
    const maxExecutions = plan.maxExecutions;
    let matched = false;
    let replaced = false;
    let candidateValue = inSequenceGroup ? workingValue : normalizedRawValue;
    const patternDebounceMs = plan.debounceMs;
    for (let execution = 0; execution < maxExecutions; execution += 1) {
      if (
        !shouldLaunchPattern({
          pattern,
          validationScope,
          fieldValue: candidateValue,
          values,
          latestProductValues,
        })
      ) {
        break;
      }
      compiledPatternRegex.lastIndex = 0;
      const match = compiledPatternRegex.exec(candidateValue);
      if ((!match || typeof match.index !== 'number') && !plan.allowWithoutRegexMatch) break;
      matched = true;
      const matchText = match?.[0] ?? candidateValue;
      const length = Math.max(1, matchText.length || candidateValue.length || 1);
      const matchIndex = typeof match?.index === 'number' ? match.index : 0;
      const replacementFields = plan.replacementFields;
      const hasReplacer = Boolean(pattern.replacementEnabled && pattern.replacementValue);
      const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
        pattern.replacementAppliesToScopes,
        validationScope
      );
      const replacementScope: FieldValidatorIssue['replacementScope'] = !hasReplacer
        ? 'none'
        : replacementFields.length === 0
          ? 'global'
          : 'field';
      const replacementActive =
        hasReplacer &&
        replacementEnabledForScope &&
        (replacementScope === 'global' || replacementFields.includes(fieldName));
      const resolvedReplacement = replacementActive
        ? resolvePatternReplacementValue({
          pattern,
          fieldValue: candidateValue,
          values,
          latestProductValues,
        })
        : null;
      const effectiveReplacement = resolvedReplacement;
      const hasEffectiveReplacement = Boolean(effectiveReplacement?.value);
      const nextValue = hasEffectiveReplacement
        ? applyResolvedReplacement({
          value: candidateValue,
          pattern,
          replacement: effectiveReplacement,
        })
        : candidateValue;
      const isNoopReplacement = hasEffectiveReplacement && nextValue === candidateValue;
      const shouldSuppressNoopReplacementProposal =
        normalizeProductValidationSkipNoopReplacementProposal(
          pattern.skipNoopReplacementProposal
        ) && isNoopReplacement;
      if (!inSequenceGroup && !shouldSuppressNoopReplacementProposal) {
        localIssues.push({
          patternId: pattern.id,
          message: pattern.message,
          severity: pattern.severity,
          matchText,
          index: matchIndex,
          length,
          regex: pattern.regex,
          flags: pattern.flags ?? null,
          replacementValue: hasEffectiveReplacement ? (effectiveReplacement?.value ?? null) : null,
          replacementApplyMode: hasEffectiveReplacement
            ? (effectiveReplacement?.applyMode ?? 'replace_matched_segment')
            : 'replace_matched_segment',
          replacementScope,
          replacementActive: replacementActive && hasEffectiveReplacement,
          postAcceptBehavior: plan.postAcceptBehavior,
          debounceMs: patternDebounceMs,
        });
      }

      if (!hasEffectiveReplacement) break;
      if (isNoopReplacement) break;
      replaced = true;
      candidateValue = nextValue;
      if (inSequenceGroup) {
        workingValue = nextValue;
        if (sequenceGroupId) {
          const aggregate = sequenceAggregates.get(sequenceGroupId);
          if (aggregate) {
            aggregate.finalValue = nextValue;
            if (pattern.severity === 'error') {
              aggregate.severity = 'error';
            }
            if (plan.postAcceptBehavior === 'stop_after_accept') {
              aggregate.postAcceptBehavior = 'stop_after_accept';
            }
            aggregate.debounceMs = Math.max(aggregate.debounceMs, patternDebounceMs);
          }
        }
      }
    }

    if (!inSequenceGroup) continue;
    const chainMode = plan.chainMode;
    if (matched && chainMode === 'stop_on_match') {
      break;
    }
    if (replaced && chainMode === 'stop_on_replace') {
      break;
    }
    if (replaced && pattern.passOutputToNext === false) {
      break;
    }
  }

  for (const aggregate of sequenceAggregates.values()) {
    if (aggregate.finalValue === aggregate.originalValue) continue;
    const diff = deriveDiffSegment(aggregate.originalValue, aggregate.finalValue);
    localIssues.push({
      patternId: `sequence:${aggregate.groupId}`,
      message: aggregate.groupLabel ? `${aggregate.groupLabel} sequence result` : 'Sequence result',
      severity: aggregate.severity,
      matchText: diff.matchText,
      index: diff.index,
      length: diff.length,
      regex: '',
      flags: null,
      replacementValue: aggregate.finalValue,
      replacementApplyMode: 'replace_whole_field',
      replacementScope: 'field',
      replacementActive: true,
      postAcceptBehavior: aggregate.postAcceptBehavior,
      debounceMs: aggregate.debounceMs,
    });
  }

  return localIssues;
}

/**
 * Validator docs: see docs/validator/function-reference.md#core.buildfieldissues
 */
export const buildFieldIssues = ({
  values,
  patterns,
  latestProductValues,
  validationScope,
}: {
  values: Record<string, unknown>;
  patterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  validationScope: ProductValidationInstanceScope;
}): Record<string, FieldValidatorIssue[]> => {
  const issues: Record<string, FieldValidatorIssue[]> = {};
  const entries = Object.entries(values);
  if (entries.length === 0 || patterns.length === 0) return issues;
  const orderedPatterns = sortValidatorPatterns(patterns);
  const sequenceGroupCounts = buildSequenceGroupCounts(orderedPatterns);
  const staticPatternsByTarget = buildStaticPatternPlans({
    orderedPatterns,
    validationScope,
    sequenceGroupCounts,
  });

  for (const [fieldName, rawValue] of entries) {
    const normalizedRawValue =
      typeof rawValue === 'string'
        ? rawValue
        : typeof rawValue === 'number' && Number.isFinite(rawValue)
          ? String(rawValue)
          : '';
    const { target, locale } = resolveFieldTargetAndLocale(fieldName);
    if (!target) continue;
    const targetPlans = staticPatternsByTarget.get(target);
    if (!targetPlans || targetPlans.length === 0) continue;
    const fieldPlans = targetPlans.filter((plan: StaticPatternPlan): boolean =>
      isPatternLocaleMatch(plan.pattern.locale, locale)
    );
    if (fieldPlans.length === 0) continue;
    const hasExternalLaunchSource = fieldPlans.some(
      (plan: StaticPatternPlan): boolean =>
        plan.pattern.launchEnabled && plan.pattern.launchSourceMode !== 'current_field'
    );
    const hasLatestPriceStockMirror = fieldPlans.some(
      (plan: StaticPatternPlan): boolean => plan.allowWithoutRegexMatch
    );
    if (!normalizedRawValue && !hasExternalLaunchSource && !hasLatestPriceStockMirror) continue;

    const fieldIssues = applyPatternPlansToField({
      fieldName,
      normalizedRawValue,
      values,
      latestProductValues,
      validationScope,
      fieldPlans,
    });
    if (fieldIssues.length > 0) issues[fieldName] = fieldIssues;
  }

  return issues;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.mergefieldissuemaps
 */
export const mergeFieldIssueMaps = (
  staticIssues: Record<string, FieldValidatorIssue[]>,
  runtimeIssues: Record<string, FieldValidatorIssue[]>
): Record<string, FieldValidatorIssue[]> => {
  const merged: Record<string, FieldValidatorIssue[]> = {};
  const keys = new Set<string>([...Object.keys(staticIssues), ...Object.keys(runtimeIssues)]);
  for (const key of keys) {
    merged[key] = [...(staticIssues[key] ?? []), ...(runtimeIssues[key] ?? [])];
  }
  return merged;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.areissuemapsequivalent
 */
export const areIssueMapsEquivalent = (
  left: Record<string, FieldValidatorIssue[]>,
  right: Record<string, FieldValidatorIssue[]>
): boolean => {
  if (left === right) return true;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    const leftList = left[key] ?? [];
    const rightList = right[key] ?? [];
    if (leftList.length !== rightList.length) return false;
    for (let index = 0; index < leftList.length; index += 1) {
      const leftIssue = leftList[index];
      const rightIssue = rightList[index];
      if (!leftIssue || !rightIssue) return false;
      if (
        leftIssue.patternId !== rightIssue.patternId ||
        leftIssue.message !== rightIssue.message ||
        leftIssue.severity !== rightIssue.severity ||
        leftIssue.matchText !== rightIssue.matchText ||
        leftIssue.index !== rightIssue.index ||
        leftIssue.length !== rightIssue.length ||
        leftIssue.regex !== rightIssue.regex ||
        leftIssue.flags !== rightIssue.flags ||
        leftIssue.replacementValue !== rightIssue.replacementValue ||
        leftIssue.replacementApplyMode !== rightIssue.replacementApplyMode ||
        leftIssue.replacementScope !== rightIssue.replacementScope ||
        leftIssue.replacementActive !== rightIssue.replacementActive ||
        leftIssue.postAcceptBehavior !== rightIssue.postAcceptBehavior ||
        leftIssue.debounceMs !== rightIssue.debounceMs
      ) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Validator docs: see docs/validator/function-reference.md#core.getissuereplacementpreview
 */
export const getIssueReplacementPreview = (value: string, issue: FieldValidatorIssue): string => {
  if (!issue.replacementValue) return value;
  if (issue.replacementApplyMode === 'replace_whole_field') {
    return issue.replacementValue;
  }
  try {
    const regex = new RegExp(issue.regex, issue.flags ?? undefined);
    const probe = regex.exec(value);
    if (!probe) return value;
    if (probe[0] === issue.replacementValue) return value;
    const nextRegex = new RegExp(issue.regex, issue.flags ?? undefined);
    return value.replace(nextRegex, issue.replacementValue);
  } catch (error) {
    logClientError(error);
    return value;
  }
};
