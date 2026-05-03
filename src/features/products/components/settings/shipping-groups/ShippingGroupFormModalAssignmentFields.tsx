'use client';

import React from 'react';

import type { ShippingGroupFormData } from '@/shared/contracts/products/shipping-groups';
import {
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Badge } from '@/shared/ui/badge';
import { FormField } from '@/shared/ui/form-section';
import { MultiSelect } from '@/shared/ui/multi-select';

import { useShippingGroupsState } from './ShippingGroupsContext';

const formatAvailableCategorySummary = (categoryCount: number): string => {
  if (categoryCount === 0) return 'No categories are available in this catalog yet.';
  if (categoryCount === 1) {
    return '1 category is available in this catalog. You can still attach multiple categories once more categories exist.';
  }
  return `${categoryCount} categories are available in this catalog. You can attach more than one category to the same shipping group.`;
};

function ShippingGroupCategoryAvailabilitySummary(): React.JSX.Element | null {
  const { formData, loadingModalCatalogCategories, modalCategoryOptions } =
    useShippingGroupsState();
  if (formData.catalogId.length === 0 || loadingModalCatalogCategories) return null;

  return (
    <p className='text-xs text-muted-foreground'>
      {formatAvailableCategorySummary(modalCategoryOptions.length)}
    </p>
  );
}

function ShippingGroupSelectedCategoryBadges(): React.JSX.Element | null {
  const { normalizedModalRuleIds, modalCategoryLabelById, setFormData } =
    useShippingGroupsState();
  if (normalizedModalRuleIds.length === 0) return null;

  return (
    <div className='space-y-2'>
      <p className='text-xs font-medium text-foreground'>
        Selected categories ({normalizedModalRuleIds.length})
      </p>
      <div className='flex flex-wrap gap-2'>
        {normalizedModalRuleIds.map((categoryId) => {
          const categoryLabel = modalCategoryLabelById.get(categoryId) ?? categoryId;
          return (
            <Badge
              key={categoryId}
              variant='outline'
              onRemove={(): void =>
                setFormData((prev: ShippingGroupFormData) => ({
                  ...prev,
                  autoAssignCategoryIds: prev.autoAssignCategoryIds.filter(
                    (selectedCategoryId) => selectedCategoryId !== categoryId
                  ),
                }))
              }
              removeLabel={`Remove ${categoryLabel}`}
            >
              {categoryLabel}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function ShippingGroupCategoryAssignmentField(): React.JSX.Element {
  const {
    formData,
    setFormData,
    modalCategoryOptions,
    normalizedModalRuleIds,
    loadingModalCatalogCategories,
    modalCatalogCategories,
  } = useShippingGroupsState();

  return (
    <FormField
      label='Auto-assign from Categories'
      description='Optional rule: products in these categories or their descendants use this shipping group automatically unless the product has a manual shipping group.'
    >
      <div className='space-y-3'>
        <MultiSelect
          options={modalCategoryOptions}
          selected={normalizedModalRuleIds}
          onChange={(values: string[]): void =>
            setFormData((prev: ShippingGroupFormData) => ({
              ...prev,
              autoAssignCategoryIds: normalizeShippingGroupRuleCategoryIds({
                categoryIds: values,
                categories: modalCatalogCategories,
              }),
            }))
          }
          placeholder='Select categories for automatic assignment'
          searchPlaceholder='Search categories...'
          ariaLabel='Auto-assign from Categories'
          disabled={formData.catalogId.length === 0}
          loading={loadingModalCatalogCategories}
          emptyMessage='No categories available for this catalog.'
        />
        <ShippingGroupCategoryAvailabilitySummary />
        <ShippingGroupSelectedCategoryBadges />
      </div>
    </FormField>
  );
}

function ShippingGroupCurrencyAssignmentField(): React.JSX.Element {
  const { formData, setFormData, modalCurrencyOptions, normalizedModalCurrencyCodes } =
    useShippingGroupsState();

  return (
    <FormField
      label='Auto-assign from Currencies'
      description='Optional rule: products using these currencies match this shipping group automatically. Combine with categories to narrow the rule.'
    >
      <MultiSelect
        options={modalCurrencyOptions}
        selected={normalizedModalCurrencyCodes}
        onChange={(values: string[]): void =>
          setFormData((prev: ShippingGroupFormData) => ({
            ...prev,
            autoAssignCurrencyCodes: normalizeShippingGroupRuleCurrencyCodes({
              currencyCodes: values,
              availableCurrencyCodes: modalCurrencyOptions.map((option) => option.value),
            }),
          }))
        }
        placeholder='Select currencies for automatic assignment'
        searchPlaceholder='Search currencies...'
        ariaLabel='Auto-assign from Currencies'
        disabled={formData.catalogId.length === 0}
        emptyMessage='No currencies available for this catalog.'
      />
    </FormField>
  );
}

export function ShippingGroupFormModalAssignmentFields(): React.JSX.Element {
  return (
    <>
      <ShippingGroupCategoryAssignmentField />
      <ShippingGroupCurrencyAssignmentField />
    </>
  );
}
