'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';

import {
  hasNonEmptyStringValue,
  PRODUCT_IDENTIFIER_FIELD_NAMES,
  PRODUCT_IDENTIFIER_OPTIONS,
  type ProductIdentifierFieldName,
} from './ProductFormGeneral.helpers';
import { ValidatedField } from './ValidatedField';

const resolveInitialIdentifierType = (values: ProductFormData): ProductIdentifierFieldName => {
  if (hasNonEmptyStringValue(values.asin)) return 'asin';
  if (hasNonEmptyStringValue(values.gtin)) return 'gtin';
  return 'ean';
};

const HiddenIdentifierInputs = ({
  identifierType,
}: {
  identifierType: ProductIdentifierFieldName;
}): React.JSX.Element => {
  const { register } = useFormContext<ProductFormData>();
  return (
    <>
      {PRODUCT_IDENTIFIER_FIELD_NAMES.filter((fieldName) => fieldName !== identifierType).map(
        (fieldName) => (
          <input key={`hidden-${fieldName}`} type='hidden' {...register(fieldName)} />
        )
      )}
    </>
  );
};

const ActiveIdentifierInput = ({
  identifierType,
}: {
  identifierType: ProductIdentifierFieldName;
}): React.JSX.Element => {
  const { register } = useFormContext<ProductFormData>();
  return (
    <Input
      key={`active-${identifierType}`}
      id={identifierType}
      {...register(identifierType)}
      placeholder={`Enter ${identifierType.toUpperCase()}`}
      aria-label={`Enter ${identifierType.toUpperCase()}`}
      aria-describedby='product-identifier-hint'
      title={`Enter ${identifierType.toUpperCase()}`}
    />
  );
};

export function ProductFormIdentifierFields(): React.JSX.Element {
  const { getValues } = useFormContext<ProductFormData>();
  const [identifierType, setIdentifierType] = useState<ProductIdentifierFieldName>(() =>
    resolveInitialIdentifierType(getValues())
  );

  return (
    <FormSection title='Identifiers' gridClassName='md:grid-cols-2'>
      <ValidatedField name='sku' label='SKU' required placeholder='Unique stock keeping unit' />
      <FormField label='Product Identifier' controlId={identifierType}>
        <div className='space-y-1.5'>
          <div className='flex gap-2'>
            <SelectSimple
              size='sm'
              value={identifierType}
              onValueChange={(value: string): void =>
                setIdentifierType(value as ProductIdentifierFieldName)
              }
              ariaLabel='Product identifier type'
              options={PRODUCT_IDENTIFIER_OPTIONS}
              className='w-[100px]'
              title='Product Identifier'
            />
            <HiddenIdentifierInputs identifierType={identifierType} />
            <ActiveIdentifierInput identifierType={identifierType} />
          </div>
          <p id='product-identifier-hint' className='text-[10px] italic leading-relaxed text-gray-500'>
            EAN, GTIN or ASIN code.
          </p>
        </div>
      </FormField>
    </FormSection>
  );
}
