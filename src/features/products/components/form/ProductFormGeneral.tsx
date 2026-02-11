'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { logClientError } from '@/features/observability';
import * as productsApi from '@/features/products/api/products';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { ProductFormData } from '@/features/products/types';
import {
  isPatternEnabledForValidationScope,
  isPatternLaunchEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/features/products/utils/validator-instance-behavior';
import {
  evaluateStringCondition,
  evaluateDynamicReplacementRecipe,
  parseDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
  ProductValidationTarget,
} from '@/shared/types/domain/products';
import { Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, UnifiedSelect, FormSection, FormField } from '@/shared/ui';
import { cn } from '@/shared/utils';

export type FieldValidatorIssue = {
  patternId: string;
  message: string;
  severity: 'error' | 'warning';
  matchText: string;
  index: number;
  length: number;
  regex: string;
  flags: string | null;
  replacementValue: string | null;
  replacementApplyMode: 'replace_whole_field' | 'replace_matched_segment';
  replacementScope: 'none' | 'global' | 'field';
  replacementActive: boolean;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

const normalizePatternSequence = (
  pattern: ProductValidationPattern,
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

const normalizePatternChainMode = (
  pattern: ProductValidationPattern
): 'continue' | 'stop_on_match' | 'stop_on_replace' => {
  if (pattern.chainMode === 'stop_on_match' || pattern.chainMode === 'stop_on_replace') {
    return pattern.chainMode;
  }
  return 'continue';
};

const getSequenceScopeKey = (pattern: ProductValidationPattern): string | null => {
  const groupId = pattern.sequenceGroupId?.trim();
  if (!groupId) return null;
  const normalizedLocale = pattern.locale?.trim().toLowerCase() ?? '*';
  return `${groupId}::${pattern.target}::${normalizedLocale}`;
};

const buildSequenceGroupCounts = (patterns: ProductValidationPattern[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;
    const scopeKey = getSequenceScopeKey(pattern);
    if (!scopeKey) continue;
    counts.set(scopeKey, (counts.get(scopeKey) ?? 0) + 1);
  }
  return counts;
};

const isPatternInSequenceGroup = (
  pattern: ProductValidationPattern,
  counts: Map<string, number>
): boolean => {
  const scopeKey = getSequenceScopeKey(pattern);
  if (!scopeKey) return false;
  return (counts.get(scopeKey) ?? 0) > 1;
};

const normalizePatternMaxExecutions = (pattern: ProductValidationPattern): number => {
  if (typeof pattern.maxExecutions !== 'number' || !Number.isFinite(pattern.maxExecutions)) {
    return 1;
  }
  return Math.min(20, Math.max(1, Math.floor(pattern.maxExecutions)));
};

const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizePostAcceptBehavior = (value: unknown): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

const sortValidatorPatterns = (patterns: ProductValidationPattern[]): ProductValidationPattern[] =>
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

const resolveFieldTargetAndLocale = (
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
  return {
    target,
    locale,
  };
};

const isPatternLocaleMatch = (patternLocale: string | null, fieldLocale: string | null): boolean => {
  if (!patternLocale) return true;
  if (!fieldLocale) return false;
  return patternLocale.toLowerCase() === fieldLocale.toLowerCase();
};

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

const isReplacementAllowedForField = (
  pattern: ProductValidationPattern,
  fieldName: string
): boolean => {
  const replacementFields = normalizeReplacementFields(pattern.replacementFields);
  if (replacementFields.length === 0) return true;
  return replacementFields.includes(fieldName);
};

const isLatestPriceStockMirrorPattern = (
  pattern: ProductValidationPattern
): boolean => {
  if (pattern.target !== 'price' && pattern.target !== 'stock') return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'latest_product_field' &&
    recipe.targetApply === 'replace_whole_field'
  );
};

const isRuntimePatternEnabled = (pattern: ProductValidationPattern): boolean =>
  Boolean(pattern.runtimeEnabled && pattern.runtimeType !== 'none');

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const resolvePatternLaunchSourceValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: ProductFormData;
  latestProductValues: Record<string, unknown> | null;
}): string => {
  if (!pattern.launchEnabled) return fieldValue;
  if (pattern.launchSourceMode === 'current_field') return fieldValue;
  if (pattern.launchSourceMode === 'form_field') {
    return toStringValue(values[(pattern.launchSourceField ?? '') as keyof ProductFormData]) ?? '';
  }
  return toStringValue(latestProductValues?.[pattern.launchSourceField ?? '']) ?? '';
};

const shouldLaunchPattern = ({
  pattern,
  validationScope,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  fieldValue: string;
  values: ProductFormData;
  latestProductValues: Record<string, unknown> | null;
}): boolean => {
  if (!pattern.launchEnabled) return true;
  if (
    !isPatternLaunchEnabledForValidationScope(
      pattern.launchAppliesToScopes,
      validationScope,
      pattern.appliesToScopes
    )
  ) {
    return (
      normalizeProductValidationLaunchScopeBehavior(pattern.launchScopeBehavior) ===
      'condition_only'
    );
  }
  if (
    pattern.launchSourceMode !== 'current_field' &&
    !pattern.launchSourceField?.trim()
  ) {
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

type ResolvedReplacement = {
  value: string;
  kind: 'static' | 'dynamic';
  applyMode: 'replace_whole_field' | 'replace_matched_segment';
} | null;

const resolvePatternReplacementValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: ProductFormData;
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
    formValues: values as unknown as Record<string, unknown>,
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

const applyResolvedReplacement = ({
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
          ? pattern.flags ?? undefined
          : `${pattern.flags ?? ''}g`
        : pattern.flags ?? undefined;
    const regex = new RegExp(pattern.regex, flags);
    return value.replace(regex, (match: string) =>
      match === replacement.value ? match : replacement.value
    );
  } catch {
    return value;
  }
};

const buildIssueSnippet = (
  value: string,
  index: number,
  length: number
): { before: string; match: string; after: string } => {
  const start = Math.max(0, index - 24);
  const end = Math.min(value.length, index + length + 24);
  const rawBefore = value.slice(start, index);
  const rawMatch = value.slice(index, Math.min(value.length, index + length));
  const rawAfter = value.slice(Math.min(value.length, index + length), end);

  return {
    before: `${start > 0 ? '...' : ''}${rawBefore}`,
    match: rawMatch || value.slice(index, Math.min(value.length, index + 1)) || ' ',
    after: `${rawAfter}${end < value.length ? '...' : ''}`,
  };
};

export const buildFieldIssues = (
  values: ProductFormData,
  patterns: ProductValidationPattern[],
  latestProductValues: Record<string, unknown> | null,
  validationScope: ProductValidationInstanceScope
): Record<string, FieldValidatorIssue[]> => {
  const deriveDiffSegment = (
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

type SequenceIssueAggregate = {
  groupId: string;
  groupLabel: string | null;
  originalValue: string;
  finalValue: string;
  severity: FieldValidatorIssue['severity'];
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

const issues: Record<string, FieldValidatorIssue[]> = {};
const entries = Object.entries(values) as Array<[string, unknown]>;
const orderedPatterns = sortValidatorPatterns(patterns);
const sequenceGroupCounts = buildSequenceGroupCounts(orderedPatterns);

for (const [fieldName, rawValue] of entries) {
  const normalizedRawValue =
      typeof rawValue === 'string'
        ? rawValue
        : typeof rawValue === 'number' && Number.isFinite(rawValue)
          ? String(rawValue)
          : '';
  const { target, locale } = resolveFieldTargetAndLocale(fieldName);
  if (!target) continue;
  const fieldPatterns = orderedPatterns.filter(
    (pattern: ProductValidationPattern): boolean =>
      pattern.enabled &&
        isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope) &&
        !isRuntimePatternEnabled(pattern) &&
        pattern.target === target &&
        isPatternLocaleMatch(pattern.locale, locale)
  );
  if (fieldPatterns.length === 0) continue;
  const hasExternalLaunchSource = fieldPatterns.some(
    (pattern: ProductValidationPattern): boolean =>
      pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
  );
  const hasLatestPriceStockMirror = fieldPatterns.some(
    (pattern: ProductValidationPattern): boolean =>
      isLatestPriceStockMirrorPattern(pattern)
  );
  if (!normalizedRawValue && !hasExternalLaunchSource && !hasLatestPriceStockMirror) continue;

  let workingValue = normalizedRawValue;
  const sequenceAggregates = new Map<string, SequenceIssueAggregate>();

  for (const pattern of fieldPatterns) {
    const inSequenceGroup = isPatternInSequenceGroup(pattern, sequenceGroupCounts);
    const sequenceGroupId = inSequenceGroup ? pattern.sequenceGroupId?.trim() || null : null;
    if (inSequenceGroup && sequenceGroupId && !sequenceAggregates.has(sequenceGroupId)) {
      sequenceAggregates.set(sequenceGroupId, {
        groupId: sequenceGroupId,
        groupLabel: pattern.sequenceGroupLabel?.trim() || null,
        originalValue: workingValue,
        finalValue: workingValue,
        severity: pattern.severity,
        postAcceptBehavior: normalizePostAcceptBehavior(pattern.postAcceptBehavior),
        debounceMs: normalizeValidationDebounceMs(pattern.validationDebounceMs),
      });
    }
    const maxExecutions = normalizePatternMaxExecutions(pattern);
    let matched = false;
    let replaced = false;
    let candidateValue = inSequenceGroup ? workingValue : normalizedRawValue;
    const patternDebounceMs = normalizeValidationDebounceMs(pattern.validationDebounceMs);
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
      try {
        const regex = new RegExp(pattern.regex, pattern.flags ?? undefined);
        const match = regex.exec(candidateValue);
        const allowWithoutRegexMatch = isLatestPriceStockMirrorPattern(pattern);
        if ((!match || typeof match.index !== 'number') && !allowWithoutRegexMatch) break;
        matched = true;
        const matchText = match?.[0] ?? candidateValue;
        const length = Math.max(1, matchText.length || candidateValue.length || 1);
        const matchIndex = typeof match?.index === 'number' ? match.index : 0;
        const replacementFields = normalizeReplacementFields(pattern.replacementFields);
        const hasReplacer = Boolean(pattern.replacementEnabled && pattern.replacementValue);
        const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
          pattern.replacementAppliesToScopes,
          validationScope,
          pattern.appliesToScopes
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
        const isNoopReplacement =
          hasEffectiveReplacement && nextValue === candidateValue;
        const shouldSuppressNoopReplacementProposal =
          normalizeProductValidationSkipNoopReplacementProposal(
            pattern.skipNoopReplacementProposal
          ) && isNoopReplacement;
        if (!inSequenceGroup && !shouldSuppressNoopReplacementProposal) {
          if (!issues[fieldName]) {
            issues[fieldName] = [];
          }
          issues[fieldName].push({
            patternId: pattern.id,
            message: pattern.message,
            severity: pattern.severity,
            matchText,
            index: matchIndex,
            length,
            regex: pattern.regex,
            flags: pattern.flags ?? null,
            replacementValue: hasEffectiveReplacement ? effectiveReplacement?.value ?? null : null,
            replacementApplyMode: hasEffectiveReplacement
              ? effectiveReplacement?.applyMode ?? 'replace_matched_segment'
              : 'replace_matched_segment',
            replacementScope,
            replacementActive: replacementActive && hasEffectiveReplacement,
            postAcceptBehavior: normalizePostAcceptBehavior(pattern.postAcceptBehavior),
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
              if (normalizePostAcceptBehavior(pattern.postAcceptBehavior) === 'stop_after_accept') {
                aggregate.postAcceptBehavior = 'stop_after_accept';
              }
              aggregate.debounceMs = Math.max(aggregate.debounceMs, patternDebounceMs);
            }
          }
        }
      } catch {
        // Invalid pattern is blocked at API write time; skip defensively.
        break;
      }
    }

    if (!inSequenceGroup) continue;
    const chainMode = normalizePatternChainMode(pattern);
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
    if (!issues[fieldName]) {
      issues[fieldName] = [];
    }
    issues[fieldName].push({
      patternId: `sequence:${aggregate.groupId}`,
      message: aggregate.groupLabel
        ? `${aggregate.groupLabel} sequence result`
        : 'Sequence result',
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
}

return issues;
};

export const mergeFieldIssueMaps = (
  staticIssues: Record<string, FieldValidatorIssue[]>,
  runtimeIssues: Record<string, FieldValidatorIssue[]>
): Record<string, FieldValidatorIssue[]> => {
  const merged: Record<string, FieldValidatorIssue[]> = {};
  const keys = new Set<string>([
    ...Object.keys(staticIssues),
    ...Object.keys(runtimeIssues),
  ]);
  for (const key of keys) {
    merged[key] = [...(staticIssues[key] ?? []), ...(runtimeIssues[key] ?? [])];
  }
  return merged;
};

const areIssueMapsEquivalent = (
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

export const getIssueReplacementPreview = (
  value: string,
  issue: FieldValidatorIssue
): string => {
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
  } catch {
    return value;
  }
};

export function ValidatorIssueHint({
  issue,
  value,
  onReplace,
  onDeny,
  denyLabel = 'Deny',
  proposedValueOverride,
  hideMatchSnippet = false,
}: {
  issue: FieldValidatorIssue;
  value: string;
  onReplace?: (() => void) | undefined;
  onDeny?: (() => void) | undefined;
  denyLabel?: 'Deny' | 'Mute';
  proposedValueOverride?: string | null;
  hideMatchSnippet?: boolean;
}): React.JSX.Element {
  const snippet = buildIssueSnippet(value, issue.index, issue.length);
  const toneClass =
    issue.severity === 'warning'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-red-500/40 bg-red-500/10 text-red-100';
  const matchClass =
    issue.severity === 'warning'
      ? 'bg-amber-300/30 text-amber-50'
      : 'bg-red-300/30 text-red-50';
  const replacementBadgeClass =
    issue.replacementScope === 'global'
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
      : issue.replacementScope === 'field'
        ? issue.replacementActive
          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100'
          : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200/80'
        : 'border-gray-500/40 bg-gray-500/10 text-gray-200/80';
  const replacementBadgeText =
    issue.replacementScope === 'global'
      ? 'Global replacer'
      : issue.replacementScope === 'field'
        ? issue.replacementActive
          ? 'Field replacer'
          : 'Field replacer (other field)'
        : 'Validation only';
  const proposedValue =
    proposedValueOverride ??
    (issue.replacementValue ? getIssueReplacementPreview(value, issue) : null);
  const hasProposedChange = Boolean(
    proposedValue !== null && proposedValue !== value
  );

  return (
    <div className={cn('mt-2 rounded-md border px-2 py-2 text-xs', toneClass)}>
      <div className='flex items-start gap-2'>
        <ArrowRight className='mt-0.5 size-4 shrink-0 animate-bounce' />
        <span className='min-w-0 flex-1 break-words'>{issue.message}</span>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-1'>
        <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px]', replacementBadgeClass)}>
          {replacementBadgeText}
        </span>
        {onDeny || (issue.replacementValue && onReplace) ? (
          <div className='ml-auto flex flex-wrap justify-end gap-1'>
            {onDeny ? (
              <Button
                type='button'
                onClick={onDeny}
                className='h-6 rounded border border-red-500/50 bg-red-500/15 px-2 text-[10px] text-red-100 hover:bg-red-500/25'
              >
                {denyLabel}
              </Button>
            ) : null}
            {issue.replacementValue && onReplace ? (
              <Button
                type='button'
                onClick={onReplace}
                className='h-6 rounded border border-emerald-500/50 bg-emerald-500/15 px-2 text-[10px] text-emerald-100 hover:bg-emerald-500/25'
              >
                Replace
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!hideMatchSnippet ? (
        <div className='mt-1 font-mono text-[11px] break-all'>
          <span className='opacity-90'>{snippet.before}</span>
          <mark className={cn('rounded px-0.5', matchClass)}>{snippet.match}</mark>
          <span className='opacity-90'>{snippet.after}</span>
        </div>
      ) : null}
      {hasProposedChange ? (
        <div className='mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5'>
          <p className='text-[10px] uppercase tracking-wide text-emerald-200/90'>
            Proposed Result
          </p>
          <p className='mt-1 break-all font-mono text-[11px] text-emerald-100'>
            {proposedValue}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ProductFormGeneral(): React.JSX.Element {
  const {
    validationInstanceScope,
    validatorEnabled,
    formatterEnabled,
    getDenyActionLabel,
    isIssueDenied,
    isIssueAccepted,
    acceptIssue,
    denyIssue,
  } = useProductValidationSettings();
  const {
    filteredLanguages,
    errors,
    product,
  } = useProductFormContext();

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  const validatorConfigQuery = useProductValidatorConfig();
  const [activeNameTab, setActiveNameTab] = useState<string>('');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState<string>('');
  const sequenceGroupDebounceRef = useRef<Record<string, number>>({});
  const fieldEditTimestampsRef = useRef<Record<string, number>>({});
  const previousFieldValuesRef = useRef<Record<string, string>>({});
  const debounceRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debounceTick, setDebounceTick] = useState(0);
  const [runtimeFieldIssues, setRuntimeFieldIssues] = useState<Record<string, FieldValidatorIssue[]>>({});

  const [identifierType, setIdentifierType] = useState<'ean' | 'gtin' | 'asin'>((): 'ean' | 'gtin' | 'asin' => {
    const vals = getValues();
    if (vals.asin) return 'asin';
    if (vals.gtin) return 'gtin';
    return 'ean';
  });
  const allValues = watch();
  const hasCatalogs = (filteredLanguages ?? []).length > 0;
  const languagesReady = (filteredLanguages ?? []).length > 0;
  const validatorPatterns = validatorConfigQuery.data?.patterns ?? [];
  const runtimePatternIds = useMemo(
    () =>
      validatorPatterns
        .filter((pattern: ProductValidationPattern) => isRuntimePatternEnabled(pattern))
        .map((pattern: ProductValidationPattern) => pattern.id),
    [validatorPatterns]
  );
  const needsLatestProductSource = useMemo(
    () =>
      validatorPatterns.some((pattern: ProductValidationPattern) => {
        const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
        return (
          recipe?.sourceMode === 'latest_product_field' ||
          (pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field')
        );
      }),
    [validatorPatterns]
  );
  const latestProductsQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.all, 'validator', 'latest-product-source'],
    queryFn: () => productsApi.getProducts({ page: 1, pageSize: 4 }),
    enabled: validatorEnabled && needsLatestProductSource,
    staleTime: 60_000,
  });
  const latestProductValues = useMemo((): Record<string, unknown> | null => {
    const list = latestProductsQuery.data ?? [];
    if (list.length === 0) return null;
    const preferred = list.find((item) => item.id !== product?.id) ?? list[0] ?? null;
    return preferred as unknown as Record<string, unknown>;
  }, [latestProductsQuery.data, product?.id]);
  useEffect(() => {
    if (!validatorEnabled || runtimePatternIds.length === 0) {
      setRuntimeFieldIssues((previous) =>
        Object.keys(previous).length === 0 ? previous : {}
      );
      return;
    }
    const timer = setTimeout(() => {
      void api
        .post<{ issues?: Record<string, FieldValidatorIssue[]> }>(
          '/api/products/validator-runtime/evaluate',
          {
            values: allValues as Record<string, unknown>,
            latestProductValues,
            patternIds: runtimePatternIds,
            validationScope: validationInstanceScope,
          },
          { logError: false }
        )
        .then((response) => {
          const nextIssues = response.issues ?? {};
          setRuntimeFieldIssues((previous) =>
            areIssueMapsEquivalent(previous, nextIssues) ? previous : nextIssues
          );
        })
        .catch((error: unknown) => {
          setRuntimeFieldIssues((previous) =>
            Object.keys(previous).length === 0 ? previous : {}
          );
          logClientError(
            error instanceof Error ? error : new Error(String(error)),
            {
              context: {
                source: 'ProductFormGeneral',
                action: 'runtimeValidatorEvaluate',
              },
            }
          );
        });
    }, 250);
    return () => {
      clearTimeout(timer);
    };
  }, [
    allValues,
    latestProductValues,
    runtimePatternIds,
    validationInstanceScope,
    validatorEnabled,
  ]);
  useEffect(() => {
    const now = Date.now();
    for (const [fieldNameRaw, rawUnknown] of Object.entries(allValues as Record<string, unknown>)) {
      const { target } = resolveFieldTargetAndLocale(fieldNameRaw);
      if (!target) continue;
      const normalizedValue =
        typeof rawUnknown === 'string'
          ? rawUnknown
          : typeof rawUnknown === 'number' && Number.isFinite(rawUnknown)
            ? String(rawUnknown)
            : '';
      if (!(fieldNameRaw in previousFieldValuesRef.current)) {
        previousFieldValuesRef.current[fieldNameRaw] = normalizedValue;
        continue;
      }
      if (previousFieldValuesRef.current[fieldNameRaw] === normalizedValue) continue;
      previousFieldValuesRef.current[fieldNameRaw] = normalizedValue;
      fieldEditTimestampsRef.current[fieldNameRaw] = now;
    }
  }, [allValues]);
  const staticFieldIssues = useMemo(
    () =>
      validatorEnabled
        ? buildFieldIssues(
          allValues,
          validatorPatterns,
          latestProductValues,
          validationInstanceScope
        )
        : ({} as Record<string, FieldValidatorIssue[]>),
    [
      allValues,
      latestProductValues,
      validationInstanceScope,
      validatorEnabled,
      validatorPatterns,
    ]
  );
  const fieldIssues = useMemo(
    () =>
      mergeFieldIssueMaps(
        staticFieldIssues,
        validatorEnabled ? runtimeFieldIssues : {}
      ),
    [runtimeFieldIssues, staticFieldIssues, validatorEnabled]
  );
  useEffect(() => {
    if (debounceRefreshTimerRef.current) {
      clearTimeout(debounceRefreshTimerRef.current);
      debounceRefreshTimerRef.current = null;
    }
    if (!validatorEnabled) return;
    const now = Date.now();
    let nextRemainingMs: number | null = null;
    for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
      const changedAt = fieldEditTimestampsRef.current[fieldName] ?? 0;
      if (changedAt <= 0) continue;
      for (const issue of issueList) {
        const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
        if (debounceMs <= 0) continue;
        const remaining = debounceMs - (now - changedAt);
        if (remaining <= 0) continue;
        nextRemainingMs =
          nextRemainingMs === null ? remaining : Math.min(nextRemainingMs, remaining);
      }
    }
    if (nextRemainingMs !== null) {
      debounceRefreshTimerRef.current = setTimeout(() => {
        setDebounceTick((prev) => prev + 1);
      }, nextRemainingMs + 10);
    }
    return () => {
      if (debounceRefreshTimerRef.current) {
        clearTimeout(debounceRefreshTimerRef.current);
        debounceRefreshTimerRef.current = null;
      }
    };
  }, [fieldIssues, validatorEnabled, debounceTick]);
  const visibleFieldIssues = useMemo((): Record<string, FieldValidatorIssue[]> => {
    if (!validatorEnabled) return {};
    const visible: Record<string, FieldValidatorIssue[]> = {};
    const now = Date.now();
    for (const [fieldName, issueList] of Object.entries(fieldIssues)) {
      const changedAt = fieldEditTimestampsRef.current[fieldName] ?? 0;
      visible[fieldName] = issueList.filter((issue: FieldValidatorIssue): boolean => {
        if (isIssueDenied(fieldName, issue.patternId)) return false;
        if (
          issue.postAcceptBehavior === 'stop_after_accept' &&
          isIssueAccepted(fieldName, issue.patternId)
        ) {
          return false;
        }
        const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
        if (debounceMs <= 0 || changedAt <= 0) return true;
        return now - changedAt >= debounceMs;
      });
    }
    return visible;
  }, [debounceTick, fieldIssues, isIssueAccepted, isIssueDenied, validatorEnabled]);
  const languageTabValues = useMemo(
    () =>
      filteredLanguages.map((language: { code: string }) => String(language.code).trim().toLowerCase()),
    [filteredLanguages]
  );
  const firstLanguageTab = languageTabValues[0] ?? '';
  const resolvedActiveNameTab = activeNameTab || firstLanguageTab;
  const resolvedActiveDescriptionTab = activeDescriptionTab || firstLanguageTab;

  useEffect(() => {
    if (!firstLanguageTab) {
      setActiveNameTab('');
      setActiveDescriptionTab('');
      return;
    }
    setActiveNameTab((prev: string) =>
      prev && languageTabValues.includes(prev) ? prev : firstLanguageTab
    );
    setActiveDescriptionTab((prev: string) =>
      prev && languageTabValues.includes(prev) ? prev : firstLanguageTab
    );
  }, [firstLanguageTab, languageTabValues]);

  const applyIssueReplacement = (
    value: string,
    issue: FieldValidatorIssue
  ): string => {
    return getIssueReplacementPreview(value, issue);
  };

  const toFieldString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const applyNumericFieldIssueReplacement = (
    fieldName: 'weight' | 'sizeLength' | 'sizeWidth' | 'length',
    issue: FieldValidatorIssue
  ): void => {
    const currentValue = toFieldString(getValues(fieldName));
    const nextValue = applyIssueReplacement(currentValue, issue);
    acceptIssue({
      fieldName,
      patternId: issue.patternId,
      postAcceptBehavior: issue.postAcceptBehavior,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
    if (nextValue === currentValue) return;
    const numericValue = Number(nextValue.replace(',', '.'));
    if (!Number.isFinite(numericValue)) return;
    const normalizedNumeric = Math.max(0, Math.floor(numericValue));
    setValue(fieldName, normalizedNumeric as ProductFormData[typeof fieldName], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) return;
    if (validatorPatterns.length === 0) return;
    const orderedPatterns = sortValidatorPatterns(validatorPatterns);
    const sequenceGroupCounts = buildSequenceGroupCounts(orderedPatterns);
    for (const [fieldNameRaw, rawUnknown] of Object.entries(allValues as Record<string, unknown>)) {
      const rawValue: string =
        typeof rawUnknown === 'string'
          ? rawUnknown
          : typeof rawUnknown === 'number' && Number.isFinite(rawUnknown)
            ? String(rawUnknown)
            : '';
      const fieldName = fieldNameRaw as keyof ProductFormData;
      const { target, locale } = resolveFieldTargetAndLocale(fieldNameRaw);
      if (!target) continue;

      const replacementPatterns = orderedPatterns.filter((pattern: ProductValidationPattern) => {
        if (!pattern.enabled) return false;
        if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationInstanceScope)) return false;
        if (isRuntimePatternEnabled(pattern)) return false;
        if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
        if (!pattern.replacementAutoApply) return false;
        if (pattern.target !== target) return false;
        if (!isPatternLocaleMatch(pattern.locale, locale)) return false;
        return isReplacementAllowedForField(pattern, fieldNameRaw);
      });

      if (replacementPatterns.length === 0) continue;
      const hasExternalLaunchSource = replacementPatterns.some(
        (pattern: ProductValidationPattern): boolean =>
          pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
      );
      const hasLatestPriceStockMirror = replacementPatterns.some(
        (pattern: ProductValidationPattern): boolean =>
          isLatestPriceStockMirrorPattern(pattern)
      );
      if (!rawValue && !hasExternalLaunchSource && !hasLatestPriceStockMirror) continue;
      let nextValue: string = rawValue;
      const fieldProcessedGroups = new Set<string>();
      for (const pattern of replacementPatterns) {
        const inSequenceGroup = isPatternInSequenceGroup(pattern, sequenceGroupCounts);
        let candidateValue: string = inSequenceGroup ? nextValue : rawValue;
        if (inSequenceGroup) {
          const groupId = pattern.sequenceGroupId?.trim();
          if (groupId && !fieldProcessedGroups.has(groupId)) {
            const debounceMs =
              pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
                ? 0
                : Math.max(0, Math.floor(pattern.sequenceGroupDebounceMs ?? 0));
            if (debounceMs > 0) {
              const key = `${groupId}:${fieldNameRaw}`;
              const now = Date.now();
              const previous = sequenceGroupDebounceRef.current[key] ?? 0;
              if (now - previous < debounceMs) {
                continue;
              }
              sequenceGroupDebounceRef.current[key] = now;
            }
            fieldProcessedGroups.add(groupId);
          }
        }
        const maxExecutions = normalizePatternMaxExecutions(pattern);
        let matched = false;
        let replaced = false;
        for (let execution = 0; execution < maxExecutions; execution += 1) {
          if (
            !shouldLaunchPattern({
              pattern,
              validationScope: validationInstanceScope,
              fieldValue: candidateValue,
              values: allValues,
              latestProductValues,
            })
          ) {
            break;
          }
          let hasMatch = false;
          try {
            const regex = new RegExp(pattern.regex, pattern.flags ?? undefined);
            hasMatch = regex.test(candidateValue);
          } catch {
            hasMatch = false;
          }
          const allowWithoutRegexMatch = isLatestPriceStockMirrorPattern(pattern);
          if (!hasMatch && !allowWithoutRegexMatch) break;
          matched = true;
          const replacement = resolvePatternReplacementValue({
            pattern,
            fieldValue: candidateValue,
            values: allValues,
            latestProductValues,
          });
          const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
            pattern.replacementAppliesToScopes,
            validationInstanceScope,
            pattern.appliesToScopes
          );
          const effectiveReplacement = replacementEnabledForScope ? replacement : null;
          const replacedValue = applyResolvedReplacement({
            value: candidateValue,
            pattern,
            replacement: effectiveReplacement,
          });
          if (replacedValue === candidateValue) break;
          replaced = true;
          candidateValue = replacedValue;
          if (inSequenceGroup) {
            nextValue = replacedValue;
          }
        }

        if (!inSequenceGroup) {
          if (candidateValue !== rawValue) {
            nextValue = candidateValue;
          }
          continue;
        }
        const chainMode = normalizePatternChainMode(pattern);
        if (matched && chainMode === 'stop_on_match') break;
        if (replaced && chainMode === 'stop_on_replace') break;
        if (replaced && pattern.passOutputToNext === false) break;
      }

      if (nextValue !== rawValue) {
        if (
          target === 'price' ||
          target === 'stock' ||
          target === 'weight' ||
          target === 'size_length' ||
          target === 'size_width' ||
          target === 'length'
        ) {
          const numericValue = Number(nextValue.replace(',', '.'));
          if (!Number.isFinite(numericValue)) continue;
          const normalizedNumeric = Math.max(0, Math.floor(numericValue));
          setValue(fieldName, normalizedNumeric as ProductFormData[typeof fieldName], {
            shouldDirty: true,
            shouldTouch: true,
          });
          continue;
        }
        setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
  }, [
    allValues,
    formatterEnabled,
    latestProductValues,
    setValue,
    validationInstanceScope,
    validatorEnabled,
    validatorPatterns,
  ]);

  return (
    <div className='space-y-6'>
      {!hasCatalogs && (
        <FormSection variant='subtle-compact' className='border-amber-500/40 bg-amber-500/10 text-amber-100'>
          <p className='text-sm'>Select a catalog to edit product titles and descriptions. Language fields are based on catalog settings.</p>
        </FormSection>
      )}

      {hasCatalogs && !languagesReady && (
        <div className='space-y-4'>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='h-4 w-40 animate-pulse rounded bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-24 animate-pulse rounded bg-slate-500/20' />
            </div>
            <div className='h-10 w-full animate-pulse rounded bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
              <div className='h-7 w-28 animate-pulse rounded bg-slate-500/20' />
            </div>
            <div className='h-24 w-full animate-pulse rounded bg-slate-500/20' />
          </div>
        </div>
      )}

      {hasCatalogs && languagesReady && (
        <FormSection>
          <Tabs
            value={resolvedActiveNameTab}
            onValueChange={setActiveNameTab}
            className='w-full'
          >
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={language.code.toLowerCase()}
                    className={cn(
                      !fieldValue?.trim()
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    )}
                  >
                    {language.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName]?.message;
              const fieldNameKey = String(fieldName);
              const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldNameKey] ?? [] : [];
              const fieldIssue = fieldIssueList[0];
              const fieldValue = (allValues[fieldName] as string | undefined) ?? '';
              return (
                <TabsContent key={language.code} value={language.code.toLowerCase()}>
                  <FormField label={`${language.name} Name`} error={error} id={fieldName}>
                    <Input
                      id={fieldName}
                      className={cn(
                        validatorEnabled &&
                        fieldIssue &&
                          (fieldIssue.severity === 'warning'
                            ? 'border-amber-500/60'
                            : 'border-red-500/60')
                      )}
                      {...register(fieldName)}
                      placeholder={`Enter product name in ${language.name}`}
                    />
                    {validatorEnabled && fieldIssueList.map((issue: FieldValidatorIssue) => (
                      <ValidatorIssueHint
                        key={issue.patternId}
                        issue={issue}
                        value={fieldValue}
                        onReplace={
                          issue.replacementValue
                            ? () => {
                              const currentValue = ((getValues(fieldName) as string | undefined) ?? '');
                              const nextValue = applyIssueReplacement(currentValue, issue);
                              acceptIssue({
                                fieldName: fieldNameKey,
                                patternId: issue.patternId,
                                postAcceptBehavior: issue.postAcceptBehavior,
                                message: issue.message,
                                replacementValue: issue.replacementValue,
                              });
                              if (nextValue !== currentValue) {
                                setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            }
                            : undefined
                        }
                        onDeny={() => {
                          denyIssue({
                            fieldName: fieldNameKey,
                            patternId: issue.patternId,
                            message: issue.message,
                            replacementValue: issue.replacementValue,
                          });
                        }}
                        denyLabel={getDenyActionLabel(issue.patternId)}
                      />
                    ))}
                  </FormField>
                </TabsContent>
              );
            })}
          </Tabs>

          <Tabs
            value={resolvedActiveDescriptionTab}
            onValueChange={setActiveDescriptionTab}
            className='w-full mt-4'
          >
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={language.code.toLowerCase()}
                    className={cn(
                      !fieldValue?.trim()
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    )}
                  >
                    {language.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {filteredLanguages.map((language: { name: string; code: string }) => {
              const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
              const error = errors[fieldName]?.message;
              const fieldNameKey = String(fieldName);
              const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldNameKey] ?? [] : [];
              const fieldIssue = fieldIssueList[0];
              const fieldValue = (allValues[fieldName] as string | undefined) ?? '';
              return (
                <TabsContent key={language.code} value={language.code.toLowerCase()}>
                  <FormField label={`${language.name} Description`} error={error} id={fieldName}>
                    <Textarea
                      id={fieldName}
                      className={cn(
                        validatorEnabled &&
                        fieldIssue &&
                          (fieldIssue.severity === 'warning'
                            ? 'border-amber-500/60'
                            : 'border-red-500/60')
                      )}
                      {...register(fieldName)}
                      placeholder={`Enter product description in ${language.name}`}
                      rows={4}
                    />
                    {validatorEnabled && fieldIssueList.map((issue: FieldValidatorIssue) => (
                      <ValidatorIssueHint
                        key={issue.patternId}
                        issue={issue}
                        value={fieldValue}
                        onReplace={
                          issue.replacementValue
                            ? () => {
                              const currentValue = ((getValues(fieldName) as string | undefined) ?? '');
                              const nextValue = applyIssueReplacement(currentValue, issue);
                              acceptIssue({
                                fieldName: fieldNameKey,
                                patternId: issue.patternId,
                                postAcceptBehavior: issue.postAcceptBehavior,
                                message: issue.message,
                                replacementValue: issue.replacementValue,
                              });
                              if (nextValue !== currentValue) {
                                setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            }
                            : undefined
                        }
                        onDeny={() => {
                          denyIssue({
                            fieldName: fieldNameKey,
                            patternId: issue.patternId,
                            message: issue.message,
                            replacementValue: issue.replacementValue,
                          });
                        }}
                        denyLabel={getDenyActionLabel(issue.patternId)}
                      />
                    ))}
                  </FormField>
                </TabsContent>
              );
            })}
          </Tabs>
        </FormSection>
      )}

      <FormSection title='Identifiers' gridClassName='md:grid-cols-2'>
        <FormField label='SKU' required error={errors.sku?.message} id='sku'>
          {(() => {
            const skuFieldIssueList = validatorEnabled ? visibleFieldIssues['sku'] ?? [] : [];
            const skuFieldIssue = skuFieldIssueList[0];
            const skuValue = (allValues.sku as string | undefined) ?? '';
            return (
              <>
                <Input
                  id='sku'
                  className={cn(
                    validatorEnabled &&
                    skuFieldIssue &&
                      (skuFieldIssue.severity === 'warning'
                        ? 'border-amber-500/60'
                        : 'border-red-500/60')
                  )}
                  {...register('sku')}
                  placeholder='Unique stock keeping unit'
                />
                {validatorEnabled &&
                  skuFieldIssueList.map((issue: FieldValidatorIssue) => (
                    <ValidatorIssueHint
                      key={issue.patternId}
                      issue={issue}
                      value={skuValue}
                      onReplace={
                        issue.replacementValue
                          ? () => {
                            const currentValue = (getValues('sku') as string | undefined) ?? '';
                            const nextValue = applyIssueReplacement(currentValue, issue);
                            acceptIssue({
                              fieldName: 'sku',
                              patternId: issue.patternId,
                              postAcceptBehavior: issue.postAcceptBehavior,
                              message: issue.message,
                              replacementValue: issue.replacementValue,
                            });
                            if (nextValue !== currentValue) {
                              setValue('sku', nextValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }
                          }
                          : undefined
                      }
                      onDeny={() => {
                        denyIssue({
                          fieldName: 'sku',
                          patternId: issue.patternId,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                      }}
                      denyLabel={getDenyActionLabel(issue.patternId)}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>
        
        <FormField label='Product Identifier' description='EAN, GTIN or ASIN code.'>
          <div className='flex gap-2'>
            <UnifiedSelect
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as 'ean' | 'gtin' | 'asin')
              }
              options={[
                { value: 'ean', label: 'EAN' },
                { value: 'gtin', label: 'GTIN' },
                { value: 'asin', label: 'ASIN' },
              ]}
              className='w-[100px]'
            />
            <Input
              id={identifierType}
              {...register(identifierType)}
              placeholder={`Enter ${identifierType.toUpperCase()}`}
            />
          </div>
        </FormField>
      </FormSection>

      <FormSection title='Dimensions & Weight' gridClassName='grid-cols-2 md:grid-cols-4'>
        <FormField label='Weight (kg)' error={errors.weight?.message} id='weight'>
          {(() => {
            const fieldName = 'weight';
            const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldName] ?? [] : [];
            const fieldIssue = fieldIssueList[0];
            const fieldValue = toFieldString(allValues[fieldName]);
            return (
              <>
                <div className='relative'>
                  <Input
                    id='weight'
                    type='number'
                    step='0.01'
                    className={cn(
                      'pr-8',
                      validatorEnabled &&
                        fieldIssue &&
                        (fieldIssue.severity === 'warning'
                          ? 'border-amber-500/60'
                          : 'border-red-500/60')
                    )}
                    {...register('weight', { valueAsNumber: true })}
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
                    KG
                  </span>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <ValidatorIssueHint
                      key={issue.patternId}
                      issue={issue}
                      value={fieldValue}
                      onReplace={
                        issue.replacementValue
                          ? () => applyNumericFieldIssueReplacement('weight', issue)
                          : undefined
                      }
                      onDeny={() => {
                        denyIssue({
                          fieldName,
                          patternId: issue.patternId,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                      }}
                      denyLabel={getDenyActionLabel(issue.patternId)}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>

        <FormField label='Length (cm)' error={errors.sizeLength?.message} id='sizeLength'>
          {(() => {
            const fieldName = 'sizeLength';
            const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldName] ?? [] : [];
            const fieldIssue = fieldIssueList[0];
            const fieldValue = toFieldString(allValues[fieldName]);
            return (
              <>
                <div className='relative'>
                  <Input
                    id='sizeLength'
                    type='number'
                    step='0.1'
                    className={cn(
                      'pr-8',
                      validatorEnabled &&
                        fieldIssue &&
                        (fieldIssue.severity === 'warning'
                          ? 'border-amber-500/60'
                          : 'border-red-500/60')
                    )}
                    {...register('sizeLength', { valueAsNumber: true })}
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
                    CM
                  </span>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <ValidatorIssueHint
                      key={issue.patternId}
                      issue={issue}
                      value={fieldValue}
                      onReplace={
                        issue.replacementValue
                          ? () => applyNumericFieldIssueReplacement('sizeLength', issue)
                          : undefined
                      }
                      onDeny={() => {
                        denyIssue({
                          fieldName,
                          patternId: issue.patternId,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                      }}
                      denyLabel={getDenyActionLabel(issue.patternId)}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>

        <FormField label='Width (cm)' error={errors.sizeWidth?.message} id='sizeWidth'>
          {(() => {
            const fieldName = 'sizeWidth';
            const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldName] ?? [] : [];
            const fieldIssue = fieldIssueList[0];
            const fieldValue = toFieldString(allValues[fieldName]);
            return (
              <>
                <div className='relative'>
                  <Input
                    id='sizeWidth'
                    type='number'
                    step='0.1'
                    className={cn(
                      'pr-8',
                      validatorEnabled &&
                        fieldIssue &&
                        (fieldIssue.severity === 'warning'
                          ? 'border-amber-500/60'
                          : 'border-red-500/60')
                    )}
                    {...register('sizeWidth', { valueAsNumber: true })}
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
                    CM
                  </span>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <ValidatorIssueHint
                      key={issue.patternId}
                      issue={issue}
                      value={fieldValue}
                      onReplace={
                        issue.replacementValue
                          ? () => applyNumericFieldIssueReplacement('sizeWidth', issue)
                          : undefined
                      }
                      onDeny={() => {
                        denyIssue({
                          fieldName,
                          patternId: issue.patternId,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                      }}
                      denyLabel={getDenyActionLabel(issue.patternId)}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>

        <FormField label='Height (cm)' error={errors.length?.message} id='length'>
          {(() => {
            const fieldName = 'length';
            const fieldIssueList = validatorEnabled ? visibleFieldIssues[fieldName] ?? [] : [];
            const fieldIssue = fieldIssueList[0];
            const fieldValue = toFieldString(allValues[fieldName]);
            return (
              <>
                <div className='relative'>
                  <Input
                    id='length'
                    type='number'
                    step='0.1'
                    className={cn(
                      'pr-8',
                      validatorEnabled &&
                        fieldIssue &&
                        (fieldIssue.severity === 'warning'
                          ? 'border-amber-500/60'
                          : 'border-red-500/60')
                    )}
                    {...register('length', { valueAsNumber: true })}
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
                    CM
                  </span>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <ValidatorIssueHint
                      key={issue.patternId}
                      issue={issue}
                      value={fieldValue}
                      onReplace={
                        issue.replacementValue
                          ? () => applyNumericFieldIssueReplacement('length', issue)
                          : undefined
                      }
                      onDeny={() => {
                        denyIssue({
                          fieldName,
                          patternId: issue.patternId,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                      }}
                      denyLabel={getDenyActionLabel(issue.patternId)}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>
      </FormSection>
    </div>
  );
}
