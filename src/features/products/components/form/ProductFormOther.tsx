'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { logClientError } from '@/features/observability';
import * as productsApi from '@/features/products/api/products';
import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { ProductFormData, CatalogRecord, PriceGroupWithDetails } from '@/features/products/types';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
import { Button, Input, UnifiedSelect, FormSection, FormField } from '@/shared/ui';

import {
  buildFieldIssues,
  getIssueReplacementPreview,
  mergeFieldIssueMaps,
  ValidatorIssueHint,
  type FieldValidatorIssue,
} from './ProductFormGeneral';

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
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

export default function ProductFormOther(): React.JSX.Element {
  const {
    errors,
    catalogs,
    catalogsError,
    selectedCatalogIds,
    selectedCategoryId,
    setCategoryId,
    filteredPriceGroups,
    product,
  } = useProductFormContext();
  const {
    validationInstanceScope,
    validatorEnabled,
    getDenyActionLabel,
    isIssueDenied,
    isIssueAccepted,
    acceptIssue,
    denyIssue,
  } = useProductValidationSettings();
  const validatorConfigQuery = useProductValidatorConfig();

  const { register, setValue, watch, getValues } = useFormContext<ProductFormData>();
  const fieldEditTimestampsRef = useRef<Record<'price' | 'stock', number>>({
    price: 0,
    stock: 0,
  });
  const previousFieldValuesRef = useRef<Record<'price' | 'stock', string | null>>({
    price: null,
    stock: null,
  });
  const debounceRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debounceTick, setDebounceTick] = useState(0);
  const [runtimeFieldIssues, setRuntimeFieldIssues] = useState<Record<string, FieldValidatorIssue[]>>({});

  const allValues = watch();
  const basePrice = watch('price') || 0;
  const selectedDefaultPriceGroupId = watch('defaultPriceGroupId');
  const hasCatalogs = selectedCatalogIds.length > 0;
  const validatorPatterns = validatorConfigQuery.data?.patterns ?? [];
  const runtimePatternIds = useMemo(
    () =>
      validatorPatterns
        .filter(
          (pattern: ProductValidationPattern) =>
            pattern.runtimeEnabled && pattern.runtimeType !== 'none'
        )
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
                source: 'ProductFormOther',
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
    const trackedFields: Array<'price' | 'stock'> = ['price', 'stock'];
    for (const fieldName of trackedFields) {
      const rawUnknown = allValues[fieldName];
      const normalizedValue =
        typeof rawUnknown === 'string'
          ? rawUnknown
          : typeof rawUnknown === 'number' && Number.isFinite(rawUnknown)
            ? String(rawUnknown)
            : '';
      const previousValue = previousFieldValuesRef.current[fieldName];
      if (previousValue === null) {
        previousFieldValuesRef.current[fieldName] = normalizedValue;
        continue;
      }
      if (previousValue === normalizedValue) continue;
      previousFieldValuesRef.current[fieldName] = normalizedValue;
      fieldEditTimestampsRef.current[fieldName] = now;
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
    const trackedFields: Array<'price' | 'stock'> = ['price', 'stock'];
    for (const fieldName of trackedFields) {
      const changedAt = fieldEditTimestampsRef.current[fieldName];
      if (changedAt <= 0) continue;
      for (const issue of fieldIssues[fieldName] ?? []) {
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
  }, [debounceTick, fieldIssues, validatorEnabled]);
  const visibleFieldIssues = useMemo((): Record<'price' | 'stock', FieldValidatorIssue[]> => {
    const now = Date.now();
    return {
      price: (fieldIssues['price'] ?? []).filter((issue: FieldValidatorIssue): boolean => {
        if (!validatorEnabled) return false;
        if (isIssueDenied('price', issue.patternId)) return false;
        if (
          issue.postAcceptBehavior === 'stop_after_accept' &&
          isIssueAccepted('price', issue.patternId)
        ) {
          return false;
        }
        const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
        const changedAt = fieldEditTimestampsRef.current.price;
        if (debounceMs <= 0 || changedAt <= 0) return true;
        return now - changedAt >= debounceMs;
      }),
      stock: (fieldIssues['stock'] ?? []).filter((issue: FieldValidatorIssue): boolean => {
        if (!validatorEnabled) return false;
        if (isIssueDenied('stock', issue.patternId)) return false;
        if (
          issue.postAcceptBehavior === 'stop_after_accept' &&
          isIssueAccepted('stock', issue.patternId)
        ) {
          return false;
        }
        const debounceMs = normalizeValidationDebounceMs(issue.debounceMs);
        const changedAt = fieldEditTimestampsRef.current.stock;
        if (debounceMs <= 0 || changedAt <= 0) return true;
        return now - changedAt >= debounceMs;
      }),
    };
  }, [debounceTick, fieldIssues, isIssueAccepted, isIssueDenied, validatorEnabled]);
  const priceIssueList = validatorEnabled ? visibleFieldIssues.price : [];
  const priceIssue = priceIssueList[0];
  const stockIssueList = validatorEnabled ? visibleFieldIssues.stock : [];
  const stockIssue = stockIssueList[0];
  const applyNumericIssueReplacement = (
    field: 'price' | 'stock',
    issue: FieldValidatorIssue
  ): void => {
    const rawCurrent = getValues(field);
    const currentValue =
      typeof rawCurrent === 'number' && Number.isFinite(rawCurrent)
        ? String(rawCurrent)
        : '';
    const nextValue = getIssueReplacementPreview(currentValue, issue);
    if (nextValue === currentValue) return;
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) return;
    const normalizedNumeric = Math.max(0, Math.floor(numericValue));
    setValue(field, normalizedNumeric as ProductFormData[typeof field], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  // Check if price group is auto-assigned from catalog (for new products only)
  const isNewProduct = !product;
  const selectedCatalog = catalogs.find((c: CatalogRecord) => selectedCatalogIds.includes(c.id));
  const isPriceGroupAutoAssigned = !!(isNewProduct && selectedCatalog?.defaultPriceGroupId);

  // Calculate prices for all price groups
  const priceGroupPrices = filteredPriceGroups.map((group: PriceGroupWithDetails) => {
    if (!group.sourceGroupId || !group.priceMultiplier) {
      // This is a base price group (not dependent)
      return {
        ...group,
        calculatedPrice: group.id === selectedDefaultPriceGroupId ? basePrice : null,
        isCalculated: false,
        sourceGroupName: undefined,
      };
    }

    // This is a dependent price group
    // Find the source group's price
    const sourceGroup = filteredPriceGroups.find((g: PriceGroupWithDetails) => g.id === group.sourceGroupId);
    if (!sourceGroup) {
      return {
        ...group,
        calculatedPrice: null,
        isCalculated: true,
        sourceGroupName: undefined,
      };
    }

    // If the source group is the selected default, use the base price
    const sourcePrice = sourceGroup.id === selectedDefaultPriceGroupId ? basePrice : null;
    const calculatedPrice = sourcePrice ? sourcePrice * group.priceMultiplier : null;

    return {
      ...group,
      calculatedPrice,
      isCalculated: true,
      sourceGroupName: sourceGroup.name,
    };
  });

  return (
    <div className='space-y-6'>
      {!hasCatalogs && (
        <FormSection variant='subtle-compact' className='border-amber-500/40 bg-amber-500/10 text-amber-100'>
          <p className='text-sm'>Select a catalog to set pricing and price groups.</p>
        </FormSection>
      )}

      {hasCatalogs && (
        <FormSection title='Pricing' gridClassName='md:grid-cols-2'>
          <FormField label='Base Price' error={errors.price?.message} id='price'>
            <Input
              id='price'
              type='number'
              step='0.01'
              className={
                validatorEnabled && priceIssue
                  ? priceIssue.severity === 'warning'
                    ? 'border-amber-500/60'
                    : 'border-red-500/60'
                  : undefined
              }
              {...register('price', { valueAsNumber: true })}
              placeholder='0.00'
            />
            {validatorEnabled &&
              priceIssueList.map((issue: FieldValidatorIssue) => (
                <ValidatorIssueHint
                  key={issue.patternId}
                  issue={issue}
                  value={String(allValues['price'] ?? '')}
                  onReplace={
                    issue.replacementValue
                      ? (): void => {
                        acceptIssue({
                          fieldName: 'price',
                          patternId: issue.patternId,
                          postAcceptBehavior: issue.postAcceptBehavior,
                          message: issue.message,
                          replacementValue: issue.replacementValue,
                        });
                        applyNumericIssueReplacement('price', issue);
                      }
                      : undefined
                  }
                  onDeny={() => {
                    denyIssue({
                      fieldName: 'price',
                      patternId: issue.patternId,
                      message: issue.message,
                      replacementValue: issue.replacementValue,
                    });
                  }}
                  denyLabel={getDenyActionLabel(issue.patternId)}
                />
              ))}
          </FormField>

          <FormField 
            label='Default Price Group' 
            id='defaultPriceGroupId'
            description={isPriceGroupAutoAssigned ? 'Auto-assigned from catalog' : undefined}
          >
            <UnifiedSelect
              onValueChange={(value: string) => setValue('defaultPriceGroupId', value)}
              value={selectedDefaultPriceGroupId || ''}
              disabled={isPriceGroupAutoAssigned}
              options={filteredPriceGroups.map((group: PriceGroupWithDetails) => ({
                value: group.id,
                label: `${group.name}${group.isDefault ? ' (Default)' : ''} (${group.currency?.code ?? group.currencyCode})`
              }))}
              placeholder='Select default price group'
              triggerClassName={isPriceGroupAutoAssigned ? 'cursor-not-allowed opacity-60' : ''}
            />
          </FormField>

          {selectedDefaultPriceGroupId && filteredPriceGroups.length > 0 && (
            <div className='md:col-span-2 space-y-2'>
              <label className='text-[11px] font-medium uppercase tracking-wider text-gray-400'>Price Groups Overview</label>
              <div className='rounded-md border border-border bg-card/40 overflow-hidden'>
                <table className='w-full text-xs'>
                  <thead className='border-b bg-muted/50'>
                    <tr>
                      <th className='px-3 py-2 text-left font-medium text-gray-400'>Price Group</th>
                      <th className='px-3 py-2 text-left font-medium text-gray-400'>Currency</th>
                      <th className='px-3 py-2 text-right font-medium text-gray-400'>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceGroupPrices.map((group: PriceGroupWithCalculatedPrice) => (
                      <tr key={group.id} className='border-b last:border-0 border-border/50'>
                        <td className='px-3 py-2'>
                          <div className='flex items-center gap-2'>
                            <span className={group.id === selectedDefaultPriceGroupId ? 'font-semibold text-white' : 'text-gray-300'}>
                              {group.name}
                            </span>
                            {group.id === selectedDefaultPriceGroupId && (
                              <span className='text-[10px] text-emerald-400 uppercase font-bold tracking-tighter'>Selected</span>
                            )}
                            {group.isCalculated && group.sourceGroupName && (
                              <span className='text-[10px] text-gray-500 italic'>
                                ({group.sourceGroupName} × {group.priceMultiplier})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-3 py-2 text-gray-500'>{group.currency?.code ?? group.currencyCode}</td>
                        <td className='px-3 py-2 text-right font-mono'>
                          {group.calculatedPrice !== null ? (
                            <span className={group.isCalculated ? 'text-blue-400' : 'text-white'}>
                              {group.calculatedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className='text-gray-600'>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className='text-[10px] text-gray-500 italic'>
                Blue prices are automatically calculated based on the default group.
              </p>
            </div>
          )}
        </FormSection>
      )}

      <FormSection title='Organization' gridClassName='md:grid-cols-2'>
        <FormField label='Supplier Name' error={errors.supplierName?.message} id='supplierName'>
          <Input id='supplierName' {...register('supplierName')} placeholder='e.g. Acme Corp' />
        </FormField>

        <FormField label='Supplier Link' error={errors.supplierLink?.message} id='supplierLink'>
          <Input id='supplierLink' {...register('supplierLink')} placeholder='https://...' />
        </FormField>

        <FormField label='Price Comment' error={errors.priceComment?.message} id='priceComment'>
          <Input id='priceComment' {...register('priceComment')} placeholder='Internal notes about pricing' />
        </FormField>

        <FormField label='Stock' error={errors.stock?.message} id='stock'>
          <Input
            id='stock'
            type='number'
            className={
              validatorEnabled && stockIssue
                ? stockIssue.severity === 'warning'
                  ? 'border-amber-500/60'
                  : 'border-red-500/60'
                : undefined
            }
            {...register('stock', { valueAsNumber: true })}
            placeholder='0'
          />
          {validatorEnabled &&
            stockIssueList.map((issue: FieldValidatorIssue) => (
              <ValidatorIssueHint
                key={issue.patternId}
                issue={issue}
                value={String(allValues['stock'] ?? '')}
                onReplace={
                  issue.replacementValue
                    ? (): void => {
                      acceptIssue({
                        fieldName: 'stock',
                        patternId: issue.patternId,
                        postAcceptBehavior: issue.postAcceptBehavior,
                        message: issue.message,
                        replacementValue: issue.replacementValue,
                      });
                      applyNumericIssueReplacement('stock', issue);
                    }
                    : undefined
                }
                onDeny={() => {
                  denyIssue({
                    fieldName: 'stock',
                    patternId: issue.patternId,
                    message: issue.message,
                    replacementValue: issue.replacementValue,
                  });
                }}
                denyLabel={getDenyActionLabel(issue.patternId)}
              />
            ))}
        </FormField>
      </FormSection>

      <FormSection title='Relationships' gridClassName='md:grid-cols-2'>
        <div className='space-y-4 md:col-span-2'>
          <CatalogMultiSelectField
            emptyMessage={catalogsError || 'No catalogs found'}
          />

          <CategorySingleSelectField
            disabled={!hasCatalogs}
            placeholder={hasCatalogs ? 'Select category' : 'Select a catalog first'}
          />
          {selectedCategoryId ? (
            <div className='-mt-2 flex justify-end'>
              <Button
                type='button'
                variant='ghost'
                className='h-7 px-2 text-xs text-gray-300 hover:text-white'
                onClick={(): void => setCategoryId(null)}
              >
                Clear category
              </Button>
            </div>
          ) : null}

          <TagMultiSelectField
            disabled={!hasCatalogs}
            placeholder={hasCatalogs ? 'Select tags' : 'Select a catalog first'}
          />

          <ProducerMultiSelectField
          />
        </div>
      </FormSection>
    </div>
  );
}
