'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/form-section';

import { ValidatedField } from './ValidatedField';

export function ProductFormDimensionsFields(): React.JSX.Element {
  return (
    <FormSection title='Dimensions & Weight' gridClassName='grid-cols-2 md:grid-cols-4'>
      <ValidatedField name='weight' label='Weight (kg)' type='number' step='0.01' unit='KG' />
      <ValidatedField name='sizeLength' label='Length (cm)' type='number' step='0.1' unit='CM' />
      <ValidatedField name='sizeWidth' label='Width (cm)' type='number' step='0.1' unit='CM' />
      <ValidatedField name='length' label='Height (cm)' type='number' step='0.1' unit='CM' />
    </FormSection>
  );
}
