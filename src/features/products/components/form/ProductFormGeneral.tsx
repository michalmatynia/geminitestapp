'use client';

import { ArrowRight } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import {
  useProductValidationActions,
  useProductValidationState,
} from '@/features/products/context/ProductValidationSettingsContext';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/features/products/utils/validator-instance-behavior';
import {
  applyResolvedReplacement,
  buildSequenceGroupCounts,
  getIssueReplacementPreview,
  isLatestPriceStockMirrorPattern,
  isPatternInSequenceGroup,
  isPatternLocaleMatch,
  isReplacementAllowedForField,
  isRuntimePatternEnabled,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  resolveFieldTargetAndLocale,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
  sortValidatorPatterns,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { ProductFormData } from '@/shared/contracts/products';
import type { ProductValidationPattern } from '@/shared/contracts/products';
import { Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, SelectSimple, FormSection, FormField, Alert, Skeleton, Hint } from '@/shared/ui';
import { cn } from '@/shared/utils';

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

export const ValidatorIssueHint = memo(function ValidatorIssueHint({
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
          <Hint uppercase size='xxs' variant='info' className='text-emerald-200/90'>
            Proposed Result
          </Hint>
          <p className='mt-1 break-all font-mono text-[11px] text-emerald-100'>
            {proposedValue}
          </p>
        </div>
      ) : null}
    </div>
  );
});

type IssueHintRowProps = {
  fieldName: string;
  issue: FieldValidatorIssue;
  fieldValue: string;
  numericField?: 'weight' | 'sizeLength' | 'sizeWidth' | 'length' | 'price' | 'stock';
};

/**
 * Memoized wrapper around ValidatorIssueHint that owns stable onReplace/onDeny
 * callbacks via useCallback. Prevents re-rendering hints for unchanged fields
 * when a sibling field is edited.
 */
export const IssueHintRow = memo(function IssueHintRow({
  fieldName,
  issue,
  fieldValue,
  numericField,
}: IssueHintRowProps): React.JSX.Element {
  const { getValues, setValue } = useFormContext<ProductFormData>();
  const { acceptIssue, denyIssue, getDenyActionLabel } = useProductValidationActions();

  const onReplace = useCallback((): void => {
    if (numericField) {
      const raw = getValues(numericField);
      const currentValue =
        typeof raw === 'string'
          ? raw
          : typeof raw === 'number' && Number.isFinite(raw)
            ? String(raw)
            : '';
      const nextValue = getIssueReplacementPreview(currentValue, issue);
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
      setValue(
        numericField,
        Math.max(0, Math.floor(numericValue)) as ProductFormData[typeof numericField],
        { shouldDirty: true, shouldTouch: true }
      );
    } else {
      const currentValue =
        (getValues(fieldName as keyof ProductFormData) as string | undefined) ?? '';
      const nextValue = getIssueReplacementPreview(currentValue, issue);
      acceptIssue({
        fieldName,
        patternId: issue.patternId,
        postAcceptBehavior: issue.postAcceptBehavior,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
      if (nextValue !== currentValue) {
        setValue(
          fieldName as keyof ProductFormData,
          nextValue as ProductFormData[keyof ProductFormData],
          { shouldDirty: true, shouldTouch: true }
        );
      }
    }
  }, [acceptIssue, fieldName, getValues, issue, numericField, setValue]);

  const onDeny = useCallback((): void => {
    denyIssue({
      fieldName,
      patternId: issue.patternId,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
  }, [denyIssue, fieldName, issue.message, issue.patternId, issue.replacementValue]);

  return (
    <ValidatorIssueHint
      issue={issue}
      value={fieldValue}
      onReplace={issue.replacementValue ? onReplace : undefined}
      onDeny={onDeny}
      denyLabel={getDenyActionLabel(issue.patternId)}
    />
  );
});

type ProductFormGeneralProps = {
  validatorPatterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
};

export default function ProductFormGeneral({
  validatorPatterns,
  latestProductValues,
  visibleFieldIssues,
}: ProductFormGeneralProps): React.JSX.Element {
  const {
    validationInstanceScope,
    validatorEnabled,
    formatterEnabled,
  } = useProductValidationState();
  const {
    filteredLanguages,
    errors,
  } = useProductFormContext();

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  const [activeNameTab, setActiveNameTab] = useState<string>('');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState<string>('');
  const sequenceGroupDebounceRef = useRef<Record<string, number>>({});

  const [identifierType, setIdentifierType] = useState<'ean' | 'gtin' | 'asin'>((): 'ean' | 'gtin' | 'asin' => {
    const vals = getValues();
    if (vals.asin) return 'asin';
    if (vals.gtin) return 'gtin';
    return 'ean';
  });

  // Subscribe only to the fields this component renders or uses in the formatter.
  // Changes to parameters, imageLinks, imageBase64s, etc. will no longer cause
  // this component to re-render.
  const [
    nameEn, namePl, nameDe,
    descEn, descPl, descDe,
    sku, weight, sizeLength, sizeWidth, fieldLength,
    supplierName, supplierLink, priceComment,
    price, stock,
  ] = watch([
    'name_en', 'name_pl', 'name_de',
    'description_en', 'description_pl', 'description_de',
    'sku', 'weight', 'sizeLength', 'sizeWidth', 'length',
    'supplierName', 'supplierLink', 'priceComment',
    'price', 'stock',
  ]);

  // Object used for field-value lookups in JSX (tab labels, hint values).
  // Only reconstructed when one of the watched fields changes.
  const displayValues = useMemo((): Record<string, unknown> => ({
    name_en: nameEn,
    name_pl: namePl,
    name_de: nameDe,
    description_en: descEn,
    description_pl: descPl,
    description_de: descDe,
    sku,
    weight,
    sizeLength,
    sizeWidth,
    length: fieldLength,
    supplierName,
    supplierLink,
    priceComment,
    price,
    stock,
  }), [
    nameEn, namePl, nameDe,
    descEn, descPl, descDe,
    sku, weight, sizeLength, sizeWidth, fieldLength,
    supplierName, supplierLink, priceComment,
    price, stock,
  ]);
  const hasCatalogs = (filteredLanguages ?? []).length > 0;
  const languagesReady = (filteredLanguages ?? []).length > 0;
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

  const toFieldString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  // Pre-compile regexes once per validatorPatterns change instead of re-creating
  // them on every loop iteration inside the formatter effect (Fix 1.2).
  const compiledPatterns = useMemo(
    () =>
      validatorPatterns.map((p: ProductValidationPattern) => {
        let compiledRegex: RegExp | null = null;
        try {
          compiledRegex = new RegExp(p.regex, p.flags ?? undefined);
        } catch {
          compiledRegex = null;
        }
        return { pattern: p, compiledRegex };
      }),
    [validatorPatterns]
  );

  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) return;
    if (compiledPatterns.length === 0) return;
    // Read current form values lazily inside the effect so we don't need allValues
    // in the dependency array. This means the effect only re-runs when one of the
    // formatter-target watched fields changes, not on every unrelated field change.
    const currentValues = getValues() as Record<string, unknown>;
    const orderedPatterns = sortValidatorPatterns(compiledPatterns.map((c) => c.pattern));
    const sequenceGroupCounts = buildSequenceGroupCounts(orderedPatterns);
    // Build a map for O(1) compiled-regex lookup inside the inner loop.
    const compiledRegexByPatternId = new Map(
      compiledPatterns.map((c) => [c.pattern.id, c.compiledRegex])
    );
    for (const [fieldNameRaw, rawUnknown] of Object.entries(currentValues)) {
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
              values: currentValues,
              latestProductValues,
            })
          ) {
            break;
          }
          // Use the pre-compiled regex instead of re-creating it each iteration.
          const precompiled = compiledRegexByPatternId.get(pattern.id) ?? null;
          let hasMatch = false;
          if (precompiled) {
            try {
              hasMatch = precompiled.test(candidateValue);
            } catch {
              hasMatch = false;
            }
          }
          const allowWithoutRegexMatch = isLatestPriceStockMirrorPattern(pattern);
          if (!hasMatch && !allowWithoutRegexMatch) break;
          matched = true;
          let replacedValue = candidateValue;
          try {
            const replacement = resolvePatternReplacementValue({
              pattern,
              fieldValue: candidateValue,
              values: currentValues,
              latestProductValues,
            });
            const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
              pattern.replacementAppliesToScopes,
              validationInstanceScope,
              pattern.appliesToScopes
            );
            const effectiveReplacement = replacementEnabledForScope ? replacement : null;
            replacedValue = applyResolvedReplacement({
              value: candidateValue,
              pattern,
              replacement: effectiveReplacement,
            });
          } catch {
            // If replacement evaluation fails (e.g. unresolved value), keep the current field value unchanged.
            break;
          }
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
    // Specific watched field values drive WHEN the formatter runs. getValues()
    // is called inside the effect to get fresh values at execution time, so we
    // don't need allValues in deps. Changes to parameters/imageLinks/imageBase64s
    // no longer trigger this effect.
    nameEn, namePl, nameDe,
    descEn, descPl, descDe,
    sku, price, stock,
    weight, sizeLength, sizeWidth, fieldLength,
    supplierName, supplierLink, priceComment,
    compiledPatterns,
    formatterEnabled,
    getValues,
    latestProductValues,
    setValue,
    validationInstanceScope,
    validatorEnabled,
  ]);

  return (
    <div className='space-y-6'>
      {!hasCatalogs && (
        <Alert variant='warning' className='mb-6'>
          <p className='text-sm'>Select a catalog to edit product titles and descriptions. Language fields are based on catalog settings.</p>
        </Alert>
      )}

      {hasCatalogs && !languagesReady && (
        <div className='space-y-4'>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <Skeleton className='h-4 w-40 bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <Skeleton className='h-7 w-24 bg-slate-500/20' />
              <Skeleton className='h-7 w-24 bg-slate-500/20' />
              <Skeleton className='h-7 w-24 bg-slate-500/20' />
            </div>
            <Skeleton className='h-10 w-full bg-slate-500/20' />
          </div>
          <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
            <div className='mb-3 flex gap-2'>
              <Skeleton className='h-7 w-28 bg-slate-500/20' />
              <Skeleton className='h-7 w-28 bg-slate-500/20' />
              <Skeleton className='h-7 w-28 bg-slate-500/20' />
            </div>
            <Skeleton className='h-24 w-full bg-slate-500/20' />
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
                const fieldValue = displayValues[String(fieldName)] as string | undefined;
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
              const fieldValue = (displayValues[String(fieldName)] as string | undefined) ?? '';
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
                      <IssueHintRow
                        key={issue.patternId}
                        fieldName={fieldNameKey}
                        issue={issue}
                        fieldValue={fieldValue}
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
                const fieldValue = displayValues[String(fieldName)] as string | undefined;
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
              const fieldValue = (displayValues[String(fieldName)] as string | undefined) ?? '';
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
                      <IssueHintRow
                        key={issue.patternId}
                        fieldName={fieldNameKey}
                        issue={issue}
                        fieldValue={fieldValue}
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
            const skuValue = (displayValues['sku'] as string | undefined) ?? '';
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
                    <IssueHintRow
                      key={issue.patternId}
                      fieldName='sku'
                      issue={issue}
                      fieldValue={skuValue}
                    />
                  ))}
              </>
            );
          })()}
        </FormField>
        
        <FormField label='Product Identifier' description='EAN, GTIN or ASIN code.'>
          <div className='flex gap-2'>
            <SelectSimple size='sm'
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
            const fieldValue = toFieldString(displayValues[String(fieldName)]);
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
                  <Hint 
                    uppercase 
                    size='xxs' 
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
                  >
                    KG
                  </Hint>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <IssueHintRow
                      key={issue.patternId}
                      fieldName={fieldName}
                      issue={issue}
                      fieldValue={fieldValue}
                      numericField={fieldName}
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
            const fieldValue = toFieldString(displayValues[String(fieldName)]);
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
                  <Hint 
                    uppercase 
                    size='xxs' 
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
                  >
                    CM
                  </Hint>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <IssueHintRow
                      key={issue.patternId}
                      fieldName={fieldName}
                      issue={issue}
                      fieldValue={fieldValue}
                      numericField={fieldName}
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
            const fieldValue = toFieldString(displayValues[String(fieldName)]);
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
                  <Hint 
                    uppercase 
                    size='xxs' 
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
                  >
                    CM
                  </Hint>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <IssueHintRow
                      key={issue.patternId}
                      fieldName={fieldName}
                      issue={issue}
                      fieldValue={fieldValue}
                      numericField={fieldName}
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
            const fieldValue = toFieldString(displayValues[String(fieldName)]);
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
                  <Hint 
                    uppercase 
                    size='xxs' 
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold'
                  >
                    CM
                  </Hint>
                </div>
                {validatorEnabled &&
                  fieldIssueList.map((issue: FieldValidatorIssue) => (
                    <IssueHintRow
                      key={issue.patternId}
                      fieldName={fieldName}
                      issue={issue}
                      fieldValue={fieldValue}
                      numericField={fieldName}
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
