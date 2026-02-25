'use client';

import React from 'react';
import { FormSection } from '@/shared/ui';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { ProductStudioProvider, useProductStudioContext } from '../../context/ProductStudioContext';

import { StudioProjectField } from './studio/StudioProjectField';
import { StudioActionsBar } from './studio/StudioActionsBar';
import { StudioSourceImageSelector } from './studio/StudioSourceImageSelector';
import { StudioVariantsGrid } from './studio/StudioVariantsGrid';
import { StudioPreviewCanvas } from './studio/StudioPreviewCanvas';
import { StudioAuditHistory } from './studio/StudioAuditHistory';

function ProductFormStudioInner(): React.JSX.Element {
  const { studioProjectId, studioActionError: _studioActionError } = useProductStudioContext();
  const { product } = useProductFormCore();

  if (!studioProjectId) {
    return (
      <FormSection title='Studio' description='Connect this product to an Image Studio project to enable permanent listing generations.'>
        <StudioProjectField />
      </FormSection>
    );
  }

  if (!product?.id) {
    return (
      <FormSection title='Studio' description='Save the product first to start permanent Studio generations.'>
        <StudioProjectField />
      </FormSection>
    );
  }

  return (
    <div className='space-y-4'>
      <FormSection title='Studio' description='Pick a product image, send it to Studio, preview generated variants, then accept one.'>
        <StudioProjectField />
        <StudioActionsBar />
      </FormSection>

      <StudioSourceImageSelector />
      <StudioVariantsGrid />
      <StudioPreviewCanvas />
      <StudioAuditHistory />
    </div>
  );
}

export default function ProductFormStudio(): React.JSX.Element {
  return (
    <ProductStudioProvider>
      <ProductFormStudioInner />
    </ProductStudioProvider>
  );
}
