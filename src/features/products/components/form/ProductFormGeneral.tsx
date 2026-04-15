'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import { coerceProductValidationTargetValue } from '@/features/products/lib/validatorTargetAdapters';
import {
  allowsPatternExecutionWithoutRegexMatch,
  applyResolvedReplacement,
  buildSequenceGroupCounts,
  isPatternConfiguredForFormatterAutoApply,
  isPatternInSequenceGroup,
  isRuntimePatternEnabled,
  normalizePatternChainMode,
  normalizePatternMaxExecutions,
  resolveFieldTargetAndLocale,
  resolvePatternReplacementValue,
  shouldLaunchPattern,
  sortValidatorPatterns,
} from '@/features/products/validation-engine/core';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { type ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { translateStructuredProductName } from '@/shared/lib/products/title-terms';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { isPatternReplacementEnabledForValidationScope } from '@/shared/lib/products/utils/validator-instance-behavior';
import { Alert } from '@/shared/ui/alert';
import { FormSection, FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';

import { cn } from '@/shared/utils/ui-utils';

import { ValidatedField } from './ValidatedField';
import { StructuredProductNameField } from './StructuredProductNameField';
import ProductFormLatestAmazonExtraction from './ProductFormLatestAmazonExtraction';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const PRODUCT_IDENTIFIER_OPTIONS = [
  { value: 'ean', label: 'EAN' },
  { value: 'gtin', label: 'GTIN' },
  { value: 'asin', label: 'ASIN' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'ean' | 'gtin' | 'asin'>>;

const resolveFocusedProductFieldName = (): string | null => {
  if (typeof document === 'undefined') return null;
  const activeElement = document.activeElement;
  if (
    !(activeElement instanceof HTMLInputElement) &&
    !(activeElement instanceof HTMLTextAreaElement) &&
    !(activeElement instanceof HTMLSelectElement)
  ) {
    return null;
  }
  return activeElement.name?.trim() || activeElement.id?.trim() || null;
};

export default function ProductFormGeneral(): React.JSX.Element {
  const {
    validationInstanceScope,
    validatorEnabled,
    formatterEnabled,
    validatorPatterns,
    latestProductValues,
  } = useProductValidationState();
  const productFormMetadata = useProductFormMetadata();
  const categories = productFormMetadata.categories ?? [];
  const filteredLanguages = productFormMetadata.filteredLanguages ?? [];
  const selectedCatalogIds = productFormMetadata.selectedCatalogIds ?? [];

  const { register, getValues, setValue, watch } = useFormContext<ProductFormData>();
  const [activeNameTab, setActiveNameTab] = useState<string>('');
  const [activeDescriptionTab, setActiveDescriptionTab] = useState<string>('');
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);
  const sequenceGroupDebounceRef = useRef<Record<string, number>>({});
  const formatterLoopGuardRef = useRef<{ recentSignatures: string[]; cycleHits: number }>({
    recentSignatures: [],
    cycleHits: 0,
  });
  const lastGeneratedPolishNameRef = useRef<string>('');
  const focusOutSyncTimeoutRef = useRef<number | null>(null);

  const [identifierType, setIdentifierType] = useState<'ean' | 'gtin' | 'asin'>(
    (): 'ean' | 'gtin' | 'asin' => {
      const vals = getValues();
      if (vals.asin) return 'asin';
      if (vals.gtin) return 'gtin';
      return 'ean';
    }
  );

  // Subscribe only to the fields this component renders or uses in the formatter.
  // Changes to parameters, imageLinks, imageBase64s, etc. will no longer cause
  // this component to re-render.
  const [
    nameEn,
    namePl,
    nameDe,
    descEn,
    descPl,
    descDe,
    sku,
    weight,
    sizeLength,
    sizeWidth,
    fieldLength,
    supplierName,
    supplierLink,
    priceComment,
    price,
    stock,
  ] = watch([
    'name_en',
    'name_pl',
    'name_de',
    'description_en',
    'description_pl',
    'description_de',
    'sku',
    'weight',
    'sizeLength',
    'sizeWidth',
    'length',
    'supplierName',
    'supplierLink',
    'priceComment',
    'price',
    'stock',
  ]);

  // Object used for field-value lookups in JSX (tab labels, hint values).
  // Only reconstructed when one of the watched fields changes.
  const displayValues = useMemo(
    (): Record<string, unknown> => ({
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
    }),
    [
      nameEn,
      namePl,
      nameDe,
      descEn,
      descPl,
      descDe,
      sku,
      weight,
      sizeLength,
      sizeWidth,
      fieldLength,
      supplierName,
      supplierLink,
      priceComment,
      price,
      stock,
    ]
  );
  const hasCatalogs = (filteredLanguages ?? []).length > 0;
  const languagesReady = (filteredLanguages ?? []).length > 0;
  const languageTabValues = useMemo(
    () =>
      filteredLanguages.map((language: { code: string }) =>
        String(language.code).trim().toLowerCase()
      ),
    [filteredLanguages]
  );
  const primaryCatalogId = selectedCatalogIds[0];
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
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

  const generatedPolishName = useMemo(
    (): string =>
      languageTabValues.includes('pl')
        ? translateStructuredProductName({
            englishTitle: typeof nameEn === 'string' ? nameEn : '',
            locale: 'pl',
            sizeTerms: sizeTermsQuery.data,
            materialTerms: materialTermsQuery.data,
            categories,
            themeTerms: themeTermsQuery.data,
          })
        : '',
    [
      categories,
      languageTabValues,
      materialTermsQuery.data,
      nameEn,
      sizeTermsQuery.data,
      themeTermsQuery.data,
    ]
  );

  useEffect(() => {
    if (!languageTabValues.includes('pl')) return;

    const rawNamePl = getValues('name_pl');
    const currentNamePl = typeof rawNamePl === 'string' ? rawNamePl : '';
    const previousGeneratedPolishName = lastGeneratedPolishNameRef.current;
    const shouldSync =
      currentNamePl.trim().length === 0 || currentNamePl === previousGeneratedPolishName;

    if (!shouldSync) return;

    lastGeneratedPolishNameRef.current = generatedPolishName;
    if (currentNamePl === generatedPolishName) return;

    setValue('name_pl', generatedPolishName, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [generatedPolishName, getValues, languageTabValues, namePl, setValue]);

  useEffect(() => {
    const syncFocusedField = (): void => {
      setFocusedFieldName(resolveFocusedProductFieldName());
    };

    const handleFocusIn = (): void => {
      syncFocusedField();
    };

    const handleFocusOut = (): void => {
      if (focusOutSyncTimeoutRef.current !== null) {
        window.clearTimeout(focusOutSyncTimeoutRef.current);
      }

      focusOutSyncTimeoutRef.current = window.setTimeout(() => {
        focusOutSyncTimeoutRef.current = null;
        syncFocusedField();
      }, 0);
    };

    syncFocusedField();
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (focusOutSyncTimeoutRef.current !== null) {
        window.clearTimeout(focusOutSyncTimeoutRef.current);
        focusOutSyncTimeoutRef.current = null;
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Pre-compile regexes once per validatorPatterns change instead of re-creating
  // them on every loop iteration inside the formatter effect (Fix 1.2).
  const compiledPatterns = useMemo(
    () =>
      validatorPatterns.map((p: ProductValidationPattern) => {
        let compiledRegex: RegExp | null;
        try {
          compiledRegex = new RegExp(p.regex, p.flags ?? undefined);
        } catch (error) {
          logClientError(error);
          compiledRegex = null;
        }
        return { pattern: p, compiledRegex };
      }),
    [validatorPatterns]
  );

  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) return;
    if (compiledPatterns.length === 0) return;
    const formatterInputSignature = JSON.stringify([
      validationInstanceScope,
      nameEn,
      namePl,
      nameDe,
      descEn,
      descPl,
      descDe,
      sku,
      price,
      stock,
      weight,
      sizeLength,
      sizeWidth,
      fieldLength,
      supplierName,
      supplierLink,
      priceComment,
    ]);
    // Read current form values lazily inside the effect so we don't need allValues
    // in the dependency array. This means the effect only re-runs when one of the
    // formatter-target watched fields changes, not on every unrelated field change.
    const currentValues = getValues() as Record<string, unknown>;
    const pendingFieldUpdates = new Map<
      keyof ProductFormData,
      ProductFormData[keyof ProductFormData]
    >();
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
      const { target } = resolveFieldTargetAndLocale(fieldNameRaw);
      if (!target) continue;

      const replacementPatterns = orderedPatterns.filter((pattern: ProductValidationPattern) => {
        if (isRuntimePatternEnabled(pattern)) return false;
        return isPatternConfiguredForFormatterAutoApply({
          pattern,
          fieldName: fieldNameRaw,
          validationScope: validationInstanceScope,
        });
      });

      if (replacementPatterns.length === 0) continue;
      const hasExternalLaunchSource = replacementPatterns.some(
        (pattern: ProductValidationPattern): boolean =>
          pattern.launchEnabled && pattern.launchSourceMode !== 'current_field'
      );
      const hasRegexOptionalExecutionBehavior = replacementPatterns.some(
        (pattern: ProductValidationPattern): boolean =>
          allowsPatternExecutionWithoutRegexMatch(pattern)
      );
      if (!rawValue && !hasExternalLaunchSource && !hasRegexOptionalExecutionBehavior) continue;
      let nextValue: string = rawValue;
      const fieldProcessedGroups = new Set<string>();
      for (const pattern of replacementPatterns) {
        const dynamicRecipe = parseDynamicReplacementRecipe(pattern.replacementValue);
        const needsLatestProductSource =
          dynamicRecipe?.sourceMode === 'latest_product_field' ||
          (pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field');
        if (needsLatestProductSource && !latestProductValues) {
          continue;
        }
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
            } catch (error) {
              logClientError(error);
              hasMatch = false;
            }
          }
          const allowWithoutRegexMatch = allowsPatternExecutionWithoutRegexMatch(pattern);
          if (!hasMatch && !allowWithoutRegexMatch) break;
          matched = true;
          let replacedValue: string;
          try {
            const replacement = resolvePatternReplacementValue({
              pattern,
              fieldValue: candidateValue,
              values: currentValues,
              latestProductValues,
            });
            const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
              pattern.replacementAppliesToScopes,
              validationInstanceScope
            );
            const effectiveReplacement = replacementEnabledForScope ? replacement : null;
            replacedValue = applyResolvedReplacement({
              value: candidateValue,
              pattern,
              replacement: effectiveReplacement,
            });
          } catch (error) {
            logClientError(error);
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
        if (focusedFieldName === fieldNameRaw) {
          continue;
        }
        const coercedValue = coerceProductValidationTargetValue({ target, value: nextValue });
        if (typeof coercedValue === 'number') {
          const currentNumeric =
            typeof rawUnknown === 'number' && Number.isFinite(rawUnknown) ? rawUnknown : Number.NaN;
          if (Number.isFinite(currentNumeric) && currentNumeric === coercedValue) {
            continue;
          }
          pendingFieldUpdates.set(fieldName, coercedValue as ProductFormData[typeof fieldName]);
          continue;
        }
        if (coercedValue === null) continue;
        pendingFieldUpdates.set(fieldName, nextValue as ProductFormData[typeof fieldName]);
      }
    }
    if (pendingFieldUpdates.size === 0) {
      formatterLoopGuardRef.current.cycleHits = 0;
      formatterLoopGuardRef.current.recentSignatures = [];
      return;
    }
    const seenBefore =
      formatterLoopGuardRef.current.recentSignatures.includes(formatterInputSignature);
    formatterLoopGuardRef.current.cycleHits = seenBefore
      ? formatterLoopGuardRef.current.cycleHits + 1
      : 0;
    formatterLoopGuardRef.current.recentSignatures = [
      ...formatterLoopGuardRef.current.recentSignatures.slice(-7),
      formatterInputSignature,
    ];
    if (formatterLoopGuardRef.current.cycleHits >= 4) {
      return;
    }
    for (const [fieldName, fieldValue] of pendingFieldUpdates.entries()) {
      setValue(fieldName, fieldValue, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [
    // Specific watched field values drive WHEN the formatter runs. getValues()
    // is called inside the effect to get fresh values at execution time, so we
    // don't need allValues in deps. Changes to parameters/imageLinks/imageBase64s
    // no longer trigger this effect.
    nameEn,
    namePl,
    nameDe,
    descEn,
    descPl,
    descDe,
    sku,
    price,
    stock,
    weight,
    focusedFieldName,
    sizeLength,
    sizeWidth,
    fieldLength,
    supplierName,
    supplierLink,
    priceComment,
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
        <Alert variant='warning' className='mb-6' data-testid='product-form-no-catalog-warning'>
          <p className='text-sm'>
            Select a catalog to edit product titles and descriptions. Language fields are based on
            catalog settings.
          </p>
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
          <Tabs value={resolvedActiveNameTab} onValueChange={setActiveNameTab} className='w-full'>
            <TabsList className='mb-4' aria-label='Product name language tabs'>
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
              return (
                <TabsContent key={language.code} value={language.code.toLowerCase()}>
                  {fieldName === 'name_en' ? (
                    <StructuredProductNameField />
                  ) : fieldName === 'name_pl' ? (
                    <StructuredProductNameField
                      fieldName='name_pl'
                      config={{
                        locale: 'pl',
                        label: `${language.name} Name`,
                        placeholder: 'Scout Regiment | 4 cm | Metal | Przypinka Anime | Attack On Titan',
                      }}
                    />
                  ) : (
                    <ValidatedField
                      name={fieldName}
                      label={`${language.name} Name`}
                      placeholder={`Enter product name in ${language.name}`}
                    />
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <Tabs
            value={resolvedActiveDescriptionTab}
            onValueChange={setActiveDescriptionTab}
            className='w-full mt-4'
          >
            <TabsList className='mb-4' aria-label='Product description language tabs'>
              {filteredLanguages.map((language: { name: string; code: string }) => {
                const fieldName =
                  `description_${language.code.toLowerCase()}` as keyof ProductFormData;
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
              const fieldName =
                `description_${language.code.toLowerCase()}` as keyof ProductFormData;
              return (
                <TabsContent key={language.code} value={language.code.toLowerCase()}>
                  <ValidatedField
                    name={fieldName}
                    label={`${language.name} Description`}
                    placeholder={`Enter product description in ${language.name}`}
                    type='textarea'
                    rows={4}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </FormSection>
      )}

      <ProductFormLatestAmazonExtraction />

      <FormSection title='Identifiers' gridClassName='md:grid-cols-2'>
        <ValidatedField name='sku' label='SKU' required placeholder='Unique stock keeping unit' />

        <FormField label='Product Identifier' controlId={identifierType}>
          <div className='space-y-1.5'>
            <div className='flex gap-2'>
              <SelectSimple
                size='sm'
                value={identifierType}
                onValueChange={(value: string): void =>
                  setIdentifierType(value as 'ean' | 'gtin' | 'asin')
                }
                ariaLabel='Product identifier type'
                options={PRODUCT_IDENTIFIER_OPTIONS}
                className='w-[100px]'
                title='Product Identifier'
              />
              <Input
                id={identifierType}
                {...register(identifierType)}
                placeholder={`Enter ${identifierType.toUpperCase()}`}
                aria-label={`Enter ${identifierType.toUpperCase()}`}
                aria-describedby='product-identifier-hint'
                title={`Enter ${identifierType.toUpperCase()}`}
              />
            </div>
            <p
              id='product-identifier-hint'
              className='text-[10px] italic leading-relaxed text-gray-500'
            >
              EAN, GTIN or ASIN code.
            </p>
          </div>
        </FormField>
      </FormSection>

      <FormSection title='Dimensions & Weight' gridClassName='grid-cols-2 md:grid-cols-4'>
        <ValidatedField name='weight' label='Weight (kg)' type='number' step='0.01' unit='KG' />

        <ValidatedField name='sizeLength' label='Length (cm)' type='number' step='0.1' unit='CM' />

        <ValidatedField name='sizeWidth' label='Width (cm)' type='number' step='0.1' unit='CM' />

        <ValidatedField name='length' label='Height (cm)' type='number' step='0.1' unit='CM' />
      </FormSection>
    </div>
  );
}
