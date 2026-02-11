'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import * as productsApi from '@/features/products/api/products';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { ProductFormData } from '@/features/products/types';
import {
  evaluateStringCondition,
  evaluateDynamicReplacementRecipe,
  parseDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
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
): { target: 'name' | 'description' | 'sku' | 'price' | 'stock' | null; locale: string | null } => {
  let target: 'name' | 'description' | 'sku' | 'price' | 'stock' | null = null;
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
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: ProductFormData;
  latestProductValues: Record<string, unknown> | null;
}): boolean => {
  if (!pattern.launchEnabled) return true;
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
  latestProductValues: Record<string, unknown> | null
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
        });
      }
      const maxExecutions = normalizePatternMaxExecutions(pattern);
      let matched = false;
      let replaced = false;
      let candidateValue = inSequenceGroup ? workingValue : normalizedRawValue;
      for (let execution = 0; execution < maxExecutions; execution += 1) {
        if (
          !shouldLaunchPattern({
            pattern,
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
          const replacementScope: FieldValidatorIssue['replacementScope'] = !hasReplacer
            ? 'none'
            : replacementFields.length === 0
              ? 'global'
              : 'field';
          const replacementActive =
            hasReplacer &&
            (replacementScope === 'global' || replacementFields.includes(fieldName));
          const resolvedReplacement = replacementActive
            ? resolvePatternReplacementValue({
              pattern,
              fieldValue: candidateValue,
              values,
              latestProductValues,
            })
            : null;
          if (!inSequenceGroup) {
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
              replacementValue: resolvedReplacement?.value ?? null,
              replacementApplyMode: resolvedReplacement?.applyMode ?? 'replace_matched_segment',
              replacementScope,
              replacementActive: replacementActive && Boolean(resolvedReplacement?.value),
            });
          }

          if (!resolvedReplacement?.value) break;
          const nextValue = applyResolvedReplacement({
            value: candidateValue,
            pattern,
            replacement: resolvedReplacement,
          });
          if (nextValue === candidateValue) break;
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
      });
    }
  }

  return issues;
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
}: {
  issue: FieldValidatorIssue;
  value: string;
  onReplace?: (() => void) | undefined;
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
  const proposedValue = issue.replacementValue
    ? getIssueReplacementPreview(value, issue)
    : null;
  const hasProposedChange = Boolean(
    proposedValue !== null && proposedValue !== value
  );

  return (
    <div className={cn('mt-2 rounded-md border px-2 py-2 text-xs', toneClass)}>
      <div className='flex items-center gap-2'>
        <ArrowRight className='size-4 animate-bounce' />
        <span>{issue.message}</span>
        <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', replacementBadgeClass)}>
          {replacementBadgeText}
        </span>
        {issue.replacementValue && onReplace && (
          <Button
            type='button'
            onClick={onReplace}
            className='ml-auto h-6 rounded border border-emerald-500/50 bg-emerald-500/15 px-2 text-[10px] text-emerald-100 hover:bg-emerald-500/25'
          >
            Replace
          </Button>
        )}
      </div>
      <div className='mt-1 font-mono text-[11px] break-all'>
        <span className='opacity-90'>{snippet.before}</span>
        <mark className={cn('rounded px-0.5', matchClass)}>{snippet.match}</mark>
        <span className='opacity-90'>{snippet.after}</span>
      </div>
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
  const { validatorEnabled, formatterEnabled } = useProductValidationSettings();
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
  const fieldIssues = useMemo(
    () =>
      validatorEnabled
        ? buildFieldIssues(allValues, validatorPatterns, latestProductValues)
        : ({} as Record<string, FieldValidatorIssue[]>),
    [allValues, latestProductValues, validatorEnabled, validatorPatterns]
  );
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
          const replacedValue = applyResolvedReplacement({
            value: candidateValue,
            pattern,
            replacement,
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
        if (target === 'price' || target === 'stock') {
          const numericValue = Number(nextValue);
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
              const fieldIssueList = validatorEnabled ? fieldIssues[fieldNameKey] ?? [] : [];
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
                              if (nextValue !== currentValue) {
                                setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            }
                            : undefined
                        }
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
              const fieldIssueList = validatorEnabled ? fieldIssues[fieldNameKey] ?? [] : [];
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
                              if (nextValue !== currentValue) {
                                setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            }
                            : undefined
                        }
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
            const skuFieldIssueList = validatorEnabled ? fieldIssues['sku'] ?? [] : [];
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
                            if (nextValue !== currentValue) {
                              setValue('sku', nextValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }
                          }
                          : undefined
                      }
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
          <div className='relative'>
            <Input
              id='weight'
              type='number'
              step='0.01'
              className='pr-8'
              {...register('weight', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              KG
            </span>
          </div>
        </FormField>

        <FormField label='Length (cm)' error={errors.sizeLength?.message} id='sizeLength'>
          <div className='relative'>
            <Input
              id='sizeLength'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('sizeLength', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>

        <FormField label='Width (cm)' error={errors.sizeWidth?.message} id='sizeWidth'>
          <div className='relative'>
            <Input
              id='sizeWidth'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('sizeWidth', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>

        <FormField label='Height (cm)' error={errors.length?.message} id='length'>
          <div className='relative'>
            <Input
              id='length'
              type='number'
              step='0.1'
              className='pr-8'
              {...register('length', { valueAsNumber: true })}
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500'>
              CM
            </span>
          </div>
        </FormField>
      </FormSection>
    </div>
  );
}
