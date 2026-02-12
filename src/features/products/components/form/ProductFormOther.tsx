'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import * as productsApi from '@/features/products/api/products';
import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import { ProductFormData, CatalogRecord, PriceGroupWithDetails, ProductCategory } from '@/features/products/types';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductValidationPattern } from '@/shared/types/domain/products';
import { Button, Input, UnifiedSelect, FormSection, FormField } from '@/shared/ui';

import { ValidatorIssueHint } from './ProductFormGeneral';

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

const extractNameEnSegment = (value: string, segmentIndex: number): string => {
  if (!value.trim()) return '';
  const parts = value.split('|').map((part: string) => part.trim());
  if (parts.length < segmentIndex + 1) return '';
  return parts[segmentIndex] ?? '';
};

const escapeRegexSegment = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function ProductFormOther(): React.JSX.Element {
  const {
    errors,
    catalogs,
    catalogsError,
    selectedCatalogIds,
    categories,
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

  const allValues = watch();
  const primaryCatalogId = selectedCatalogIds[0] ?? '';
  const selectedCategoryName = useMemo((): string => {
    if (!selectedCategoryId) return '';
    const category =
      categories.find((item: ProductCategory) => item.id === selectedCategoryId) ?? null;
    return category?.name?.trim() ?? '';
  }, [categories, selectedCategoryId]);
  const nameEnSegment4 = useMemo(
    () => extractNameEnSegment(String(allValues['name_en'] ?? ''), 3),
    [allValues]
  );
  const nameEnSegment4RegexEscaped = useMemo(
    () => escapeRegexSegment(nameEnSegment4),
    [nameEnSegment4]
  );
  const validatorValues = useMemo(
    () => {
      const values: Record<string, unknown> = {
        ...(allValues as unknown as Record<string, unknown>),
        categoryId: selectedCategoryId ?? '',
        categoryName: selectedCategoryName,
        primaryCatalogId,
        nameEnSegment4,
        nameEnSegment4RegexEscaped,
      };
      return values;
    },
    [
      allValues,
      nameEnSegment4,
      nameEnSegment4RegexEscaped,
      primaryCatalogId,
      selectedCategoryId,
      selectedCategoryName,
    ]
  );
  const basePrice = watch('price') || 0;
  const selectedDefaultPriceGroupId = watch('defaultPriceGroupId');
  const hasCatalogs = selectedCatalogIds.length > 0;
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
  const { visibleFieldIssues } = useProductValidatorIssues({
    values: validatorValues,
    runtimeValues: validatorValues,
    patterns: validatorPatterns,
    latestProductValues,
    validationScope: validationInstanceScope,
    validatorEnabled,
    isIssueDenied,
    isIssueAccepted,
    trackedFields: ['price', 'stock', 'categoryId', 'name_en'],
    resolveChangedAt: (fieldName: string, timestamps: Record<string, number>): number => {
      if (fieldName === 'categoryId') {
        return Math.max(
          timestamps['categoryId'] ?? 0,
          timestamps['name_en'] ?? 0
        );
      }
      return timestamps[fieldName] ?? 0;
    },
    source: 'ProductFormOther',
  });
  const getIssueList = (fieldName: string): FieldValidatorIssue[] => {
    if (!validatorEnabled) return [];
    const issueList = visibleFieldIssues[fieldName];
    return Array.isArray(issueList) ? issueList : [];
  };
  const priceIssueList = getIssueList('price');
  const priceIssue = priceIssueList[0];
  const stockIssueList = getIssueList('stock');
  const stockIssue = stockIssueList[0];
  const categoryIssueList = getIssueList('categoryId');
  const categoryNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const category of categories) {
      const id = typeof category.id === 'string' ? category.id.trim() : '';
      if (!id) continue;
      const name = typeof category.name === 'string' ? category.name.trim() : '';
      map.set(id, name || id);
    }
    return map;
  }, [categories]);
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
  const applyCategoryIssueReplacement = (issue: FieldValidatorIssue): void => {
    const currentValue = selectedCategoryId ?? '';
    const nextValue = getIssueReplacementPreview(currentValue, issue).trim();
    if (!nextValue || nextValue === currentValue) return;
    setCategoryId(nextValue);
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
          {validatorEnabled &&
            categoryIssueList.map((issue: FieldValidatorIssue) => (
              (() => {
                const currentCategoryLabel =
                  selectedCategoryName ||
                  (selectedCategoryId ? categoryNameById.get(selectedCategoryId) ?? selectedCategoryId : '(none)');
                const replacementId = issue.replacementValue?.trim() ?? '';
                const proposedCategoryLabel = replacementId
                  ? categoryNameById.get(replacementId) ?? replacementId
                  : null;
                return (
                  <ValidatorIssueHint
                    key={issue.patternId}
                    issue={issue}
                    value={currentCategoryLabel}
                    proposedValueOverride={proposedCategoryLabel}
                    hideMatchSnippet
                    onReplace={
                      issue.replacementValue
                        ? (): void => {
                          acceptIssue({
                            fieldName: 'categoryId',
                            patternId: issue.patternId,
                            postAcceptBehavior: issue.postAcceptBehavior,
                            message: issue.message,
                            replacementValue: issue.replacementValue,
                          });
                          applyCategoryIssueReplacement(issue);
                        }
                        : undefined
                    }
                    onDeny={() => {
                      denyIssue({
                        fieldName: 'categoryId',
                        patternId: issue.patternId,
                        message: issue.message,
                        replacementValue: issue.replacementValue,
                      });
                    }}
                    denyLabel={getDenyActionLabel(issue.patternId)}
                  />
                );
              })()
            ))}
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
