'use client';

import React from 'react';
import {
  Alert,
  Badge,
  FormField,
  FormModal,
  Input,
  MultiSelect,
  SelectSimple,
  Textarea,
} from '@/shared/ui';
import { useShippingGroupsState, type ShippingGroupFormData } from './ShippingGroupsContext';
import {
  DRAFT_SHIPPING_GROUP_ID,
} from './shipping-group-utils';
import {
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

export function ShippingGroupFormModal(): React.JSX.Element | null {
  const {
    showModal,
    setShowModal,
    editingShippingGroup,
    formData,
    setFormData,
    catalogOptions,
    modalCategoryOptions,
    modalCurrencyOptions,
    normalizedModalRuleIds,
    normalizedModalCurrencyCodes,
    loadingModalCatalogCategories,
    modalCatalogCategories,
    modalRuleCoverage,
    redundantModalRuleSummary,
    missingModalRuleSummary,
    shouldShowNormalizedModalRuleSummary,
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary,
    loadingModalCatalogShippingGroups,
    modalShippingGroupRuleConflicts,
    modalCategoryLabelById,
    handleSave,
    saveShippingGroupMutation,
  } = useShippingGroupsState();

  if (!showModal) return null;

  return (
    <FormModal
      open={showModal}
      onClose={(): void => setShowModal(false)}
      title={editingShippingGroup ? 'Edit Shipping Group' : 'Create Shipping Group'}
      onSave={(): void => {
        void handleSave();
      }}
      isSaving={saveShippingGroupMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <FormField label='Name'>
          <Input
            className='h-9'
            value={formData.name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: ShippingGroupFormData) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            placeholder='Shipping group name'
            aria-label='Shipping group name'
            title='Shipping group name'
          />
        </FormField>

        <FormField label='Catalog'>
          <SelectSimple
            size='sm'
            value={formData.catalogId}
            onValueChange={(value: string): void =>
              setFormData((prev: ShippingGroupFormData) => ({
                ...prev,
                catalogId: value,
                autoAssignCategoryIds: [],
                autoAssignCurrencyCodes: [],
              }))
            }
            options={catalogOptions}
            placeholder='Select catalog'
            ariaLabel='Select catalog'
            title='Select catalog'
          />
        </FormField>

        <FormField
          label='Description'
          description='Optional internal note about when this shipping group should be used.'
        >
          <Textarea
            value={formData.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setFormData((prev: ShippingGroupFormData) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder='Internal shipping notes'
            aria-label='Shipping group description'
            title='Shipping group description'
          />
        </FormField>

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
              disabled={!formData.catalogId}
              loading={loadingModalCatalogCategories}
              emptyMessage='No categories available for this catalog.'
            />

            {formData.catalogId && !loadingModalCatalogCategories ? (
              <p className='text-xs text-muted-foreground'>
                {modalCategoryOptions.length === 0
                  ? 'No categories are available in this catalog yet.'
                  : modalCategoryOptions.length === 1
                    ? '1 category is available in this catalog. You can still attach multiple categories once more categories exist.'
                    : `${modalCategoryOptions.length} categories are available in this catalog. You can attach more than one category to the same shipping group.`}
              </p>
            ) : null}

            {normalizedModalRuleIds.length > 0 ? (
              <div className='space-y-2'>
                <p className='text-xs font-medium text-foreground'>
                  Selected categories ({normalizedModalRuleIds.length})
                </p>
                <div className='flex flex-wrap gap-2'>
                  {normalizedModalRuleIds.map((categoryId) => (
                    <Badge key={categoryId} variant='outline'>
                      {modalCategoryLabelById.get(categoryId) ?? categoryId}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </FormField>

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
            disabled={!formData.catalogId}
            emptyMessage='No currencies available for this catalog.'
          />
        </FormField>

        {modalRuleCoverage.descendantSummary ? (
          <Alert variant='info' className='-mt-2'>
            <div className='text-sm'>
              This rule also matches descendant categories:{' '}
              <strong>{modalRuleCoverage.descendantSummary}</strong>.
            </div>
          </Alert>
        ) : null}

        {redundantModalRuleSummary ? (
          <Alert variant='info' className='-mt-2'>
            <div className='text-sm'>
              Redundant descendant categories will be omitted on save:{' '}
              <strong>{redundantModalRuleSummary}</strong>.
            </div>
          </Alert>
        ) : null}

        {missingModalRuleSummary ? (
          <Alert variant='warning' className='-mt-2'>
            <div className='text-sm'>
              Missing categories will be removed on save:{' '}
              <strong>{missingModalRuleSummary}</strong>.
            </div>
          </Alert>
        ) : null}

        {shouldShowNormalizedModalRuleSummary ? (
          normalizedModalRuleSummary || normalizedModalCurrencySummary ? (
            <Alert variant='info' className='-mt-2'>
              <div className='text-sm'>
                Effective auto-assign rule after save:{' '}
                <strong>
                  {[
                    normalizedModalRuleSummary,
                    normalizedModalCurrencySummary
                      ? `currencies: ${normalizedModalCurrencySummary}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </strong>.
              </div>
            </Alert>
          ) : (
            <Alert variant='warning' className='-mt-2'>
              <div className='text-sm'>
                This rule will stop auto-assigning products after save because no valid
                categories remain.
              </div>
            </Alert>
          )
        ) : null}

        {!loadingModalCatalogShippingGroups && modalShippingGroupRuleConflicts.length > 0 ? (
          <Alert variant='warning' className='-mt-2'>
            <div className='space-y-1 text-sm'>
              <p>
                This auto-assign rule overlaps with other shipping groups in this catalog.
                Products in the overlapping categories will need a manual shipping-group
                override unless you adjust these rules.
              </p>
              {modalShippingGroupRuleConflicts.map((conflict) => {
                const overlapLabel =
                  conflict.appliesToAllCategories
                    ? 'all categories'
                    : (formatCategoryRuleSummary({
                        categoryIds: conflict.overlapCategoryIds,
                        categoryLabelById: modalCategoryLabelById,
                      }) ?? `${conflict.overlapCategoryIds.length} categories`);
                const overlapCurrencyLabel =
                  conflict.appliesToAllCurrencies
                    ? 'all currencies'
                    : (formatCurrencyRuleSummary({
                        currencyCodes: conflict.overlapCurrencyCodes,
                      }) ?? `${conflict.overlapCurrencyCodes.length} currencies`);
                const otherGroupName =
                  conflict.groupIds[0] === (editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID)
                    ? conflict.groupNames[1]
                    : conflict.groupNames[0];

                return (
                  <p key={conflict.groupIds.join(':')}>
                    Overlaps with <strong>{otherGroupName}</strong> on{' '}
                    <strong>{overlapLabel}</strong> in <strong>{overlapCurrencyLabel}</strong>.
                  </p>
                );
              })}
            </div>
          </Alert>
        ) : null}

        <FormField
          label='Tradera Shipping Condition'
          description='Optional Tradera-facing shipping/delivery label to use later in listing flows.'
        >
          <Input
            className='h-9'
            value={formData.traderaShippingCondition}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: ShippingGroupFormData) => ({
                ...prev,
                traderaShippingCondition: event.target.value,
              }))
            }
            placeholder='Buyer pays shipping'
            aria-label='Tradera shipping condition'
            title='Tradera shipping condition'
          />
        </FormField>

        <FormField
          label='Tradera Shipping Price (EUR)'
          description='Optional EUR amount to use when Tradera opens the shipping options modal during browser listings.'
        >
          <Input
            className='h-9'
            type='number'
            min='0'
            step='0.01'
            value={formData.traderaShippingPriceEur}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setFormData((prev: ShippingGroupFormData) => ({
                ...prev,
                traderaShippingPriceEur: event.target.value,
              }))
            }
            placeholder='5.00'
            aria-label='Tradera shipping price in EUR'
            title='Tradera shipping price in EUR'
          />
        </FormField>
      </div>
    </FormModal>
  );
}
