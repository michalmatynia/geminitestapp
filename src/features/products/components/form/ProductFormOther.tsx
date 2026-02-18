'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { useProductValidationSettings } from '@/features/products/context/ProductValidationSettingsContext';
import { ProductFormData, CatalogRecord, PriceGroupWithDetails, ProductCategory } from '@/features/products/types';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { Button, Input, SelectSimple, FormSection, FormField, DataTable, StatusBadge, Alert, Label } from '@/shared/ui';

import { ValidatorIssueHint } from './ProductFormGeneral';

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

type ProductFormOtherProps = {
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
};

export default function ProductFormOther({
  visibleFieldIssues,
}: ProductFormOtherProps): React.JSX.Element {
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
    validatorEnabled,
    getDenyActionLabel,
    acceptIssue,
    denyIssue,
  } = useProductValidationSettings();

  const { register, setValue, watch, getValues } = useFormContext<ProductFormData>();
  const allValues = watch();
  const selectedCategoryName = useMemo((): string => {
    if (!selectedCategoryId) return '';
    const category =
      categories.find((item: ProductCategory) => item.id === selectedCategoryId) ?? null;
    return category?.name?.trim() ?? '';
  }, [categories, selectedCategoryId]);
  const basePrice = watch('price') || 0;
  const selectedDefaultPriceGroupId = watch('defaultPriceGroupId');
  const hasCatalogs = selectedCatalogIds.length > 0;
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
        <Alert variant='warning' className='mb-6'>
          <p className='text-sm'>Select a catalog to set pricing and price groups.</p>
        </Alert>
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
            <SelectSimple size='sm'
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
              <Label className='text-[11px] font-medium uppercase tracking-wider text-gray-400'>Price Groups Overview</Label>
              <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden'>
                <DataTable
                  columns={[
                    {
                      accessorKey: 'name',
                      header: 'Price Group',
                      cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
                        <div className='flex items-center gap-2'>
                          <span className={row.original.id === selectedDefaultPriceGroupId ? 'font-semibold text-white' : 'text-gray-300'}>
                            {row.original.name}
                          </span>
                          {row.original.id === selectedDefaultPriceGroupId && (
                            <StatusBadge
                              status='Selected'
                              variant='active'
                              size='sm'
                              className='font-bold'
                            />
                          )}
                          {row.original.isCalculated && row.original.sourceGroupName && (
                            <span className='text-[10px] text-gray-500 italic'>
                              ({row.original.sourceGroupName} × {row.original.priceMultiplier})
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      accessorKey: 'currencyCode',
                      header: 'Currency',
                      cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => <span className='text-gray-500'>{row.original.currency?.code ?? row.original.currencyCode}</span>
                    },
                    {
                      accessorKey: 'calculatedPrice',
                      header: () => <div className='text-right'>Price</div>,
                      cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
                        <div className='text-right font-mono'>
                          {row.original.calculatedPrice !== null ? (
                            <span className={row.original.isCalculated ? 'text-blue-400' : 'text-white'}>
                              {row.original.calculatedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className='text-gray-600'>-</span>
                          )}
                        </div>
                      )
                    }
                  ]}
                  data={priceGroupPrices}
                />
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
