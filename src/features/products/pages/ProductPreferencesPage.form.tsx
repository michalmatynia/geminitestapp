import type { ChangeEvent, Dispatch, JSX, SetStateAction } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductListPreferences } from '@/shared/contracts/products/filters';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  FILTER_VISIBILITY_OPTIONS,
  NAME_LOCALE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  THUMBNAIL_SOURCE_OPTIONS,
  TRIGGER_RUN_FEEDBACK_OPTIONS,
} from './ProductPreferencesPage.constants';

type ProductPreferencesFormProps = {
  preferences: ProductListPreferences;
  setPreferences: Dispatch<SetStateAction<ProductListPreferences>>;
  catalogOptions: Array<LabeledOptionDto<string>>;
};

const updatePreferences = (
  setPreferences: Dispatch<SetStateAction<ProductListPreferences>>,
  updates: Partial<ProductListPreferences>
): void => {
  setPreferences((current) => ({ ...current, ...updates }));
};

const resolveNameLocale = (value: string): ProductListPreferences['nameLocale'] => {
  if (value === 'name_pl') return 'name_pl';
  if (value === 'name_de') return 'name_de';
  return 'name_en';
};

const resolveThumbnailSource = (value: string): ProductListPreferences['thumbnailSource'] => {
  if (value === 'link') return 'link';
  if (value === 'base64') return 'base64';
  return 'file';
};

const ProductNameLocaleField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField label='Product Name Language' description='Default language for product names in the list'>
    <SelectSimple
      size='sm'
      value={props.preferences.nameLocale}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { nameLocale: resolveNameLocale(value) })
      }
      options={NAME_LOCALE_OPTIONS}
      ariaLabel='Product Name Language'
      title='Product Name Language'
    />
  </FormField>
);

const CatalogFilterField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField
    label='Default Catalog Filter'
    description='Default catalog filter when opening the product list'
  >
    <SelectSimple
      size='sm'
      value={props.preferences.catalogFilter}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { catalogFilter: value })
      }
      options={props.catalogOptions}
      ariaLabel='Default Catalog Filter'
      title='Default Catalog Filter'
    />
  </FormField>
);

const CurrencyCodeField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField
    label='Preferred Currency'
    description='Preferred currency code for price display (leave empty for catalog default)'
  >
    <Input
      id='currencyCode'
      value={props.preferences.currencyCode ?? ''}
      onChange={(event: ChangeEvent<HTMLInputElement>): void => {
        const currencyCode = event.target.value;
        updatePreferences(props.setPreferences, {
          currencyCode: currencyCode.length > 0 ? currencyCode : 'PLN',
        });
      }}
      placeholder='EUR, USD, PLN, etc.'
      aria-label='EUR, USD, PLN, etc.'
      title='EUR, USD, PLN, etc.'
    />
  </FormField>
);

const ThumbnailSourceField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField
    label='Thumbnail Source'
    description='Choose which image source is used for product list thumbnails'
  >
    <SelectSimple
      size='sm'
      value={props.preferences.thumbnailSource}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { thumbnailSource: resolveThumbnailSource(value) })
      }
      options={THUMBNAIL_SOURCE_OPTIONS}
      ariaLabel='Thumbnail Source'
      title='Thumbnail Source'
    />
  </FormField>
);

const PageSizeField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField label='Products Per Page' description='Number of products to display per page'>
    <SelectSimple
      size='sm'
      value={String(props.preferences.pageSize)}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { pageSize: Number.parseInt(value, 10) })
      }
      options={PAGE_SIZE_OPTIONS}
      ariaLabel='Products Per Page'
      title='Products Per Page'
    />
  </FormField>
);

const FilterVisibilityField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField
    label='Filters Button Default'
    description='Choose whether the Product List starts with filters shown or hidden'
  >
    <SelectSimple
      size='sm'
      value={props.preferences.filtersCollapsedByDefault ? 'hidden' : 'shown'}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { filtersCollapsedByDefault: value === 'hidden' })
      }
      options={FILTER_VISIBILITY_OPTIONS}
      ariaLabel='Filters Button Default'
      title='Filters Button Default'
    />
  </FormField>
);

const TriggerRunFeedbackField = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormField
    label='Trigger Run Feedback Pills'
    description='Show or hide AI trigger run feedback pills across the product list'
  >
    <SelectSimple
      size='sm'
      value={props.preferences.showTriggerRunFeedback ? 'shown' : 'hidden'}
      onValueChange={(value: string): void =>
        updatePreferences(props.setPreferences, { showTriggerRunFeedback: value === 'shown' })
      }
      options={TRIGGER_RUN_FEEDBACK_OPTIONS}
      ariaLabel='Trigger Run Feedback Pills'
      title='Trigger Run Feedback Pills'
    />
  </FormField>
);

export const ProductPreferencesForm = (props: ProductPreferencesFormProps): JSX.Element => (
  <FormSection title='Product List Settings' className='p-6'>
    <div className='space-y-4'>
      <ProductNameLocaleField {...props} />
      <CatalogFilterField {...props} />
      <CurrencyCodeField {...props} />
      <ThumbnailSourceField {...props} />
      <PageSizeField {...props} />
      <FilterVisibilityField {...props} />
      <TriggerRunFeedbackField {...props} />
    </div>
  </FormSection>
);
