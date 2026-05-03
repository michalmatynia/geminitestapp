import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ShippingGroupFormData } from '@/shared/contracts/products/shipping-groups';
import { normalizeShippingGroupRuleCategoryIds } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Badge } from '@/shared/ui/badge';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

import {
  getCategoryAvailabilityMessage,
  hasCatalogId,
} from './ShippingGroupsSettings.helpers';

export type ShippingGroupFormDataSetter = Dispatch<SetStateAction<ShippingGroupFormData>>;
type TextFormField = 'name' | 'description' | 'traderaShippingCondition' | 'traderaShippingPriceEur';

const setTextField = (
  setFormData: ShippingGroupFormDataSetter,
  field: TextFormField,
  value: string
): void => {
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};

type BasicFieldsProps = {
  formData: ShippingGroupFormData;
  setFormData: ShippingGroupFormDataSetter;
  catalogOptions: Array<LabeledOptionDto<string>>;
};

export const ShippingGroupBasicFields = ({
  formData,
  setFormData,
  catalogOptions,
}: BasicFieldsProps): React.JSX.Element => (
  <>
    <FormField label='Name'>
      <Input
        className='h-9'
        value={formData.name}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          setTextField(setFormData, 'name', event.target.value)
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
          setFormData((prev) => ({
            ...prev,
            catalogId: value,
            autoAssignCategoryIds: [],
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
          setTextField(setFormData, 'description', event.target.value)
        }
        placeholder='Internal shipping notes'
        aria-label='Shipping group description'
        title='Shipping group description'
      />
    </FormField>
  </>
);

type SelectedCategoryBadgesProps = {
  selectedCategoryIds: readonly string[];
  categoryLabelById: Map<string, string>;
  setFormData: ShippingGroupFormDataSetter;
};

const SelectedCategoryBadges = ({
  selectedCategoryIds,
  categoryLabelById,
  setFormData,
}: SelectedCategoryBadgesProps): React.JSX.Element | null => {
  if (selectedCategoryIds.length === 0) return null;

  return (
    <div className='space-y-2'>
      <p className='text-xs font-medium text-foreground'>
        Selected categories ({selectedCategoryIds.length})
      </p>
      <div className='flex flex-wrap gap-2'>
        {selectedCategoryIds.map((categoryId) => {
          const categoryLabel = categoryLabelById.get(categoryId) ?? categoryId;
          return (
            <Badge
              key={categoryId}
              variant='outline'
              onRemove={(): void =>
                setFormData((prev) => ({
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
};

type CategoryRuleFieldProps = {
  formData: ShippingGroupFormData;
  setFormData: ShippingGroupFormDataSetter;
  modalCatalogCategories: readonly ProductCategory[];
  categoryOptions: Array<LabeledOptionDto<string>>;
  categoryLabelById: Map<string, string>;
  loadingModalCatalogCategories: boolean;
};

export const CategoryRuleField = ({
  formData,
  setFormData,
  modalCatalogCategories,
  categoryOptions,
  categoryLabelById,
  loadingModalCatalogCategories,
}: CategoryRuleFieldProps): React.JSX.Element => (
  <FormField
    label='Auto-assign from Categories'
    description='Optional rule: products in these categories or their descendants use this shipping group automatically unless the product has a manual shipping group.'
  >
    <div className='space-y-3'>
      <MultiSelect
        options={categoryOptions}
        selected={formData.autoAssignCategoryIds}
        onChange={(values: string[]): void =>
          setFormData((prev) => ({
            ...prev,
            autoAssignCategoryIds: normalizeShippingGroupRuleCategoryIds({
              categoryIds: values,
              categories: modalCatalogCategories,
            }),
          }))
        }
        placeholder='Select categories for automatic assignment'
        searchPlaceholder='Search categories...'
        disabled={!hasCatalogId(formData.catalogId)}
        loading={loadingModalCatalogCategories}
        emptyMessage='No categories available for this catalog.'
      />

      {hasCatalogId(formData.catalogId) && !loadingModalCatalogCategories ? (
        <p className='text-xs text-muted-foreground'>
          {getCategoryAvailabilityMessage(categoryOptions.length)}
        </p>
      ) : null}

      <SelectedCategoryBadges
        selectedCategoryIds={formData.autoAssignCategoryIds}
        categoryLabelById={categoryLabelById}
        setFormData={setFormData}
      />
    </div>
  </FormField>
);

type TraderaFieldsProps = {
  formData: ShippingGroupFormData;
  setFormData: ShippingGroupFormDataSetter;
};

export const TraderaFields = ({
  formData,
  setFormData,
}: TraderaFieldsProps): React.JSX.Element => (
  <>
    <FormField
      label='Tradera Shipping Condition'
      description='Optional Tradera-facing shipping/delivery label to use later in listing flows.'
    >
      <Input
        className='h-9'
        value={formData.traderaShippingCondition}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          setTextField(setFormData, 'traderaShippingCondition', event.target.value)
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
          setTextField(setFormData, 'traderaShippingPriceEur', event.target.value)
        }
        placeholder='5.00'
        aria-label='Tradera shipping price in EUR'
        title='Tradera shipping price in EUR'
      />
    </FormField>
  </>
);
