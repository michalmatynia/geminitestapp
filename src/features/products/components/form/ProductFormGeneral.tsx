'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import * as productsApi from '@/features/products/api/products';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import { ProductFormData } from '@/features/products/types';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/features/products/utils/validator-instance-behavior';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
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
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
import { Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, SelectSimple, FormSection, FormField } from '@/shared/ui';
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
    queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
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
  const { visibleFieldIssues } = useProductValidatorIssues({
    values: allValues as Record<string, unknown>,
    runtimeValues: allValues as Record<string, unknown>,
    patterns: validatorPatterns,
    latestProductValues,
    validationScope: validationInstanceScope,
    validatorEnabled,
    isIssueDenied,
    isIssueAccepted,
    source: 'ProductFormGeneral',
  });
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
