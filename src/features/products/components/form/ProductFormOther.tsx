'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { Alert } from '@/shared/ui/alert';
import { FormSection } from '@/shared/ui/form-section';

import { ProductFormOtherPricingSection } from './ProductFormOther.pricing';
import { ProductFormOtherRelationshipsSection } from './ProductFormOther.relationships';
import { ValidatedField } from './ValidatedField';

const readArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readNullableString = (value: unknown): string | null => {
  const normalized = readString(value);
  return normalized !== '' ? normalized : null;
};

const readNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const readNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const isMissingProduct = (product: unknown): boolean => product === null || product === undefined;

export default function ProductFormOther(): React.JSX.Element {
  const metadata = useProductFormMetadata();
  const { product } = useProductFormCore();
  const { validatorEnabled, visibleFieldIssues } = useProductValidationState();
  const { setValue, watch } = useFormContext<ProductFormData>();
  const selectedCatalogIds = readArray<string>(metadata.selectedCatalogIds);
  const hasCatalogs = selectedCatalogIds.length > 0;
  const selectedShippingGroupId = readString(watch('shippingGroupId'));
  const selectedDefaultPriceGroupId = readString(watch('defaultPriceGroupId'));

  return (
    <div className='space-y-6'>
      {hasCatalogs === false ? (
        <Alert variant='warning' className='mb-6'>
          <p className='text-sm'>Select a catalog to set pricing and price groups.</p>
        </Alert>
      ) : null}
      <ProductFormOtherPricingSection
        hasCatalogs={hasCatalogs}
        isNewProduct={isMissingProduct(product)}
        catalogs={readArray<CatalogRecord>(metadata.catalogs)}
        selectedCatalogIds={selectedCatalogIds}
        basePrice={readNumber(watch('price'))}
        sourcePrice={readNullableNumber(watch('sourcePrice'))}
        selectedDefaultPriceGroupId={selectedDefaultPriceGroupId}
        filteredPriceGroups={readArray<PriceGroupWithDetails>(metadata.filteredPriceGroups)}
        setValue={setValue}
      />
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
      <ProductFormOtherRelationshipsSection
        catalogsError={readNullableString(metadata.catalogsError)}
        hasCatalogs={hasCatalogs}
        validatorEnabled={validatorEnabled}
        visibleFieldIssues={visibleFieldIssues}
        selectedCatalogIds={selectedCatalogIds}
        categories={readArray<ProductCategory>(metadata.categories)}
        producers={readArray<{ id: string; name: string }>(metadata.producers)}
        selectedCategoryId={metadata.selectedCategoryId}
        selectedProducerIds={readArray<string>(metadata.selectedProducerIds)}
        setCategoryId={metadata.setCategoryId}
        shippingGroups={readArray<ProductShippingGroup>(metadata.shippingGroups)}
        shippingGroupsLoading={metadata.shippingGroupsLoading === true}
        selectedShippingGroupId={selectedShippingGroupId}
        setValue={setValue}
      />
    </div>
  );
}
