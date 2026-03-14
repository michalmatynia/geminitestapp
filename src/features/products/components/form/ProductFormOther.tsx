'use client';

import { memo, useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { CatalogMultiSelectField } from '@/features/products/components/form/CatalogMultiSelectField';
import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';
import { ProducerMultiSelectField } from '@/features/products/components/form/ProducerMultiSelectField';
import { TagMultiSelectField } from '@/features/products/components/form/TagMultiSelectField';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import {
  useProductValidationActions,
  useProductValidationState,
} from '@/features/products/context/ProductValidationSettingsContext';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import {
  ProductFormData,
  CatalogRecord,
  PriceGroupWithDetails,
  ProductCategory,
} from '@/shared/contracts/products';
import {
  Button,
  SelectSimple,
  FormSection,
  FormField,
  StandardDataTablePanel,
  StatusBadge,
  Alert,
} from '@/features/products/ui';

import { ValidatedField } from './ValidatedField';
import { ValidatorIssueHint } from './ValidatorIssueHint';

interface PriceGroupWithCalculatedPrice extends PriceGroupWithDetails {
  calculatedPrice: number | null;
  isCalculated: boolean;
  sourceGroupName: string | undefined;
}

// ── Category issue hint ───────────────────────────────────────────────────────
// Owns stable onReplace/onDeny callbacks so parent re-renders don't cause
// unnecessary re-renders of category issue hints.

type CategoryIssueHintRowProps = {
  issue: FieldValidatorIssue;
  currentCategoryLabel: string;
  proposedCategoryLabel: string | null;
  selectedCategoryId: string | null;
};

const CategoryIssueHintRow = memo(function CategoryIssueHintRow(
  props: CategoryIssueHintRowProps
): React.JSX.Element {
  const { issue, currentCategoryLabel, proposedCategoryLabel, selectedCategoryId } = props;

  const { setCategoryId } = useProductFormMetadata();
  const { acceptIssue, denyIssue, getDenyActionLabel } = useProductValidationActions();

  const onReplace = useCallback((): void => {
    const currentValue = selectedCategoryId ?? '';
    const nextValue = getIssueReplacementPreview(currentValue, issue).trim();
    void acceptIssue({
      fieldName: 'categoryId',
      patternId: issue.patternId,
      postAcceptBehavior: issue.postAcceptBehavior,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
    if (!nextValue || nextValue === currentValue) return;
    setCategoryId(nextValue);
  }, [acceptIssue, issue, selectedCategoryId, setCategoryId]);

  const onDeny = useCallback((): void => {
    void denyIssue({
      fieldName: 'categoryId',
      patternId: issue.patternId,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
  }, [denyIssue, issue.message, issue.patternId, issue.replacementValue]);
  return (
    <ValidatorIssueHint
      issue={issue}
      value={currentCategoryLabel}
      proposedValueOverride={proposedCategoryLabel}
      hideMatchSnippet
      onReplace={issue.replacementValue ? onReplace : undefined}
      onDeny={onDeny}
      denyLabel={getDenyActionLabel(issue.patternId)}
    />
  );
});

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductFormOther(): React.JSX.Element {
  const {
    catalogs,
    catalogsError,
    selectedCatalogIds,
    categories,
    selectedCategoryId,
    setCategoryId,
    filteredPriceGroups,
  } = useProductFormMetadata();

  const { product } = useProductFormCore();

  // Subscribe only to the fields this component needs — avoids cascade re-renders
  // triggered by unrelated fields (name, description, etc.).
  const { validatorEnabled, visibleFieldIssues } = useProductValidationState();

  const { setValue, watch } = useFormContext<ProductFormData>();
  const basePrice = watch('price') || 0;
  const selectedDefaultPriceGroupId = watch('defaultPriceGroupId');

  const selectedCategoryName = useMemo((): string => {
    if (!selectedCategoryId) return '';
    const category =
      categories.find((item: ProductCategory) => item.id === selectedCategoryId) ?? null;
    return category?.name?.trim() ?? '';
  }, [categories, selectedCategoryId]);

  const hasCatalogs = selectedCatalogIds.length > 0;

  const getIssueList = (fieldName: string): FieldValidatorIssue[] => {
    if (!validatorEnabled) return [];
    const issueList = visibleFieldIssues[fieldName];
    return Array.isArray(issueList) ? issueList : [];
  };
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

  // Check if price group is auto-assigned from catalog (for new products only)
  const isNewProduct = !product;
  const selectedCatalog = catalogs.find((c: CatalogRecord) => selectedCatalogIds.includes(c.id));
  const isPriceGroupAutoAssigned = !!(isNewProduct && selectedCatalog?.defaultPriceGroupId);

  // Calculate prices for all price groups
  const priceGroupPrices = filteredPriceGroups.map((group: PriceGroupWithDetails) => {
    if (!group.sourceGroupId || !group.priceMultiplier) {
      return {
        ...group,
        calculatedPrice: group.id === selectedDefaultPriceGroupId ? basePrice : null,
        isCalculated: false,
        sourceGroupName: undefined,
      };
    }

    const sourceGroup = filteredPriceGroups.find(
      (g: PriceGroupWithDetails) => g.id === group.sourceGroupId
    );
    if (!sourceGroup) {
      return {
        ...group,
        calculatedPrice: null,
        isCalculated: true,
        sourceGroupName: undefined,
      };
    }

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
          <ValidatedField
            name='price'
            label='Base Price'
            type='number'
            step='0.01'
            placeholder='0.00'
          />

          <FormField
            label='Default Price Group'
            id='defaultPriceGroupId'
            description={isPriceGroupAutoAssigned ? 'Auto-assigned from catalog' : undefined}
          >
            <SelectSimple
              size='sm'
              onValueChange={(value: string) =>
                setValue('defaultPriceGroupId', value, {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
              value={selectedDefaultPriceGroupId || ''}
              disabled={isPriceGroupAutoAssigned}
              ariaLabel='Default price group'
              options={filteredPriceGroups.map((group: PriceGroupWithDetails) => ({
                value: group.id,
                label: `${group.name}${group.isDefault ? ' (Default)' : ''} (${group.currency?.code ?? group.currencyCode})`,
              }))}
              placeholder='Select default price group'
              triggerClassName={isPriceGroupAutoAssigned ? 'cursor-not-allowed opacity-60' : ''}
             title="Select default price group"/>
          </FormField>

          {selectedDefaultPriceGroupId && filteredPriceGroups.length > 0 && (
            <div className='md:col-span-2 space-y-2'>
              <StandardDataTablePanel
                title='Price Groups Overview'
                description='Blue prices are automatically calculated based on the default group.'
                columns={[
                  {
                    accessorKey: 'name',
                    header: 'Price Group',
                    cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
                      <div className='flex items-center gap-2'>
                        <span
                          className={
                            row.original.id === selectedDefaultPriceGroupId
                              ? 'font-semibold text-white'
                              : 'text-gray-300'
                          }
                        >
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
                    ),
                  },
                  {
                    accessorKey: 'currencyCode',
                    header: 'Currency',
                    cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
                      <span className='text-gray-500'>
                        {row.original.currency?.code ?? row.original.currencyCode}
                      </span>
                    ),
                  },
                  {
                    accessorKey: 'calculatedPrice',
                    header: () => <div className='text-right'>Price</div>,
                    cell: ({ row }: { row: { original: PriceGroupWithCalculatedPrice } }) => (
                      <div className='text-right font-mono'>
                        {row.original.calculatedPrice !== null ? (
                          <span
                            className={row.original.isCalculated ? 'text-blue-400' : 'text-white'}
                          >
                            {row.original.calculatedPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className='text-gray-600'>-</span>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={priceGroupPrices}
                variant='flat'
              />
            </div>
          )}
        </FormSection>
      )}

      <FormSection title='Organization' gridClassName='md:grid-cols-2'>
        <ValidatedField name='supplierName' label='Supplier Name' placeholder='e.g. Acme Corp' />

        <ValidatedField name='supplierLink' label='Supplier Link' placeholder='https://...' />

        <ValidatedField
          name='priceComment'
          label='Price Comment'
          placeholder='Internal notes about pricing'
        />

        <ValidatedField name='stock' label='Stock' type='number' placeholder='0' />
      </FormSection>

      <FormSection title='Relationships' gridClassName='md:grid-cols-2'>
        <div className='space-y-4 md:col-span-2'>
          <CatalogMultiSelectField emptyMessage={catalogsError || 'No catalogs found'} />

          <CategorySingleSelectField
            disabled={!hasCatalogs}
            placeholder={hasCatalogs ? 'Select category' : 'Select a catalog first'}
          />
          {validatorEnabled &&
            categoryIssueList.map((issue: FieldValidatorIssue) => {
              const currentCategoryLabel =
                selectedCategoryName ||
                (selectedCategoryId
                  ? (categoryNameById.get(selectedCategoryId) ?? selectedCategoryId)
                  : '(none)');
              const replacementId = issue.replacementValue?.trim() ?? '';
              const proposedCategoryLabel = replacementId
                ? (categoryNameById.get(replacementId) ?? replacementId)
                : null;
              return (
                <CategoryIssueHintRow
                  key={issue.patternId}
                  issue={issue}
                  currentCategoryLabel={currentCategoryLabel}
                  proposedCategoryLabel={proposedCategoryLabel}
                  selectedCategoryId={selectedCategoryId}
                />
              );
            })}
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

          <ProducerMultiSelectField />
        </div>
      </FormSection>
    </div>
  );
}
