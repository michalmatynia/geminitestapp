'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { ProductFormData } from '@/features/products/types';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
import { Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, UnifiedSelect, FormSection, FormField } from '@/shared/ui';
import { cn } from '@/shared/utils';

type FieldValidatorIssue = {
  patternId: string;
  message: string;
  severity: 'error' | 'warning';
  matchText: string;
  index: number;
  length: number;
  regex: string;
  flags: string | null;
  replacementValue: string | null;
  replacementScope: 'none' | 'global' | 'field';
  replacementActive: boolean;
};

type ProductFormGeneralProps = {
  validatorEnabled: boolean;
  formatterEnabled: boolean;
};

const resolveFieldTargetAndLocale = (
  fieldName: string
): { target: 'name' | 'description' | null; locale: string | null } => {
  const target: 'name' | 'description' | null = fieldName.startsWith('name_')
    ? 'name'
    : fieldName.startsWith('description_')
      ? 'description'
      : null;
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

const applyPatternReplacement = (value: string, pattern: ProductValidationPattern): string => {
  if (!pattern.replacementEnabled || !pattern.replacementValue) return value;
  const replacementValue = pattern.replacementValue;
  try {
    const currentFlags = pattern.flags ?? '';
    const replacementFlags = currentFlags.includes('g') ? currentFlags : `${currentFlags}g`;
    const regex = new RegExp(pattern.regex, replacementFlags || undefined);
    return value.replace(regex, (match: string) =>
      match === replacementValue ? match : replacementValue
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

const buildFieldIssues = (
  values: ProductFormData,
  patterns: ProductValidationPattern[]
): Record<string, FieldValidatorIssue[]> => {
  const issues: Record<string, FieldValidatorIssue[]> = {};
  const entries = Object.entries(values) as Array<[string, unknown]>;

  for (const [fieldName, rawValue] of entries) {
    if (typeof rawValue !== 'string' || !rawValue) continue;
    const { target, locale } = resolveFieldTargetAndLocale(fieldName);
    if (!target) continue;

    for (const pattern of patterns) {
      if (!pattern.enabled || pattern.target !== target) continue;
      if (!isPatternLocaleMatch(pattern.locale, locale)) continue;
      try {
        const regex = new RegExp(pattern.regex, pattern.flags ?? undefined);
        const match = regex.exec(rawValue);
        if (!match || typeof match.index !== 'number') continue;
        const matched = match[0] ?? '';
        const length = Math.max(1, matched.length);
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
        if (!issues[fieldName]) {
          issues[fieldName] = [];
        }
        issues[fieldName].push({
          patternId: pattern.id,
          message: pattern.message,
          severity: pattern.severity,
          matchText: matched,
          index: match.index,
          length,
          regex: pattern.regex,
          flags: pattern.flags ?? null,
          replacementValue: replacementActive ? pattern.replacementValue : null,
          replacementScope,
          replacementActive,
        });
      } catch {
        // Invalid pattern is blocked at API write time; skip defensively.
      }
    }
  }

  return issues;
};

function ValidatorIssueHint({
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
    </div>
  );
}

export default function ProductFormGeneral({
  validatorEnabled,
  formatterEnabled,
}: ProductFormGeneralProps): React.JSX.Element {
  const {
    filteredLanguages,
    errors,
  } = useProductFormContext();

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  const validatorConfigQuery = useProductValidatorConfig();

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
  const fieldIssues = useMemo(
    () =>
      validatorEnabled
        ? buildFieldIssues(allValues, validatorPatterns)
        : ({} as Record<string, FieldValidatorIssue[]>),
    [allValues, validatorEnabled, validatorPatterns]
  );

  const applyIssueReplacement = (
    value: string,
    issue: FieldValidatorIssue
  ): string => {
    if (!issue.replacementValue) return value;
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

  useEffect(() => {
    if (!formatterEnabled) return;
    for (const [fieldNameRaw, rawValue] of Object.entries(allValues)) {
      if (typeof rawValue !== 'string' || !rawValue) continue;
      const fieldName = fieldNameRaw as keyof ProductFormData;
      const { target, locale } = resolveFieldTargetAndLocale(fieldNameRaw);
      if (!target) continue;

      const replacementPatterns = validatorPatterns.filter((pattern: ProductValidationPattern) => {
        if (!pattern.enabled) return false;
        if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
        if (pattern.target !== target) return false;
        if (!isPatternLocaleMatch(pattern.locale, locale)) return false;
        return isReplacementAllowedForField(pattern, fieldNameRaw);
      });

      if (replacementPatterns.length === 0) continue;
      let nextValue = rawValue;
      for (const pattern of replacementPatterns) {
        nextValue = applyPatternReplacement(nextValue, pattern);
      }

      if (nextValue !== rawValue) {
        setValue(fieldName, nextValue as ProductFormData[typeof fieldName], {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
  }, [allValues, formatterEnabled, setValue, validatorPatterns]);

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
          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-name` : 'english-name'} className='w-full'>
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `name_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-name`}
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
              const fieldIssueList = fieldIssues[fieldNameKey] ?? [];
              const fieldIssue = fieldIssueList[0];
              const fieldValue = (allValues[fieldName] as string | undefined) ?? '';
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-name`}>
                  <FormField label={`${language.name} Name`} error={error} id={fieldName}>
                    <Input
                      id={fieldName}
                      className={cn(
                        fieldIssue &&
                          (fieldIssue.severity === 'warning'
                            ? 'border-amber-500/60'
                            : 'border-red-500/60')
                      )}
                      {...register(fieldName)}
                      placeholder={`Enter product name in ${language.name}`}
                    />
                    {fieldIssueList.map((issue: FieldValidatorIssue) => (
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

          <Tabs defaultValue={filteredLanguages[0] ? `${filteredLanguages[0].name.toLowerCase()}-description` : 'english-description'} className='w-full mt-4'>
            <TabsList className='mb-4'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName = `description_${language.code.toLowerCase()}` as keyof ProductFormData;
                const fieldValue = allValues[fieldName] as string | undefined;
                return (
                  <TabsTrigger
                    key={language.code}
                    value={`${language.name.toLowerCase()}-description`}
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
              const fieldIssueList = fieldIssues[fieldNameKey] ?? [];
              const fieldIssue = fieldIssueList[0];
              const fieldValue = (allValues[fieldName] as string | undefined) ?? '';
              return (
                <TabsContent key={language.code} value={`${language.name.toLowerCase()}-description`}>
                  <FormField label={`${language.name} Description`} error={error} id={fieldName}>
                    <Textarea
                      id={fieldName}
                      className={cn(
                        fieldIssue &&
                          (fieldIssue.severity === 'warning'
                            ? 'border-amber-500/60'
                            : 'border-red-500/60')
                      )}
                      {...register(fieldName)}
                      placeholder={`Enter product description in ${language.name}`}
                      rows={4}
                    />
                    {fieldIssueList.map((issue: FieldValidatorIssue) => (
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
          <Input
            id='sku'
            {...register('sku')}
            placeholder='Unique stock keeping unit'
          />
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
