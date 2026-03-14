'use client';

import React from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { FormField, SelectSimple } from '@/features/products/ui';

export function StudioProjectField(): React.JSX.Element {
  const { studioProjectId, setStudioProjectId, studioProjectOptions, isStudioLoading } =
    useProductStudioContext();

  const STUDIO_PROJECT_NOT_CONNECTED = '__product_studio_not_connected__';

  return (
    <FormField
      id='studioProjectIdFromStudioTab'
      label='Studio Project'
      description='Defaults to Product settings and can be overridden for this product.'
    >
      <SelectSimple
        size='sm'
        value={studioProjectId ?? STUDIO_PROJECT_NOT_CONNECTED}
        onValueChange={(value: string): void => {
          setStudioProjectId(value === STUDIO_PROJECT_NOT_CONNECTED ? null : value);
        }}
        options={studioProjectOptions}
        placeholder={isStudioLoading ? 'Loading Studio projects...' : 'Select Studio project'}
        disabled={isStudioLoading}
      />
    </FormField>
  );
}
