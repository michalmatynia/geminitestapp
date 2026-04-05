'use client';

import React from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import {
  buildProductStudioWorkspaceContextBundle,
  PRODUCT_EDITOR_CONTEXT_ROOT_IDS,
} from '@/features/products/context-registry/workspace';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { FormSection } from '@/shared/ui/form-section';

import { StudioActionsBar } from './studio/StudioActionsBar';
import { StudioAuditHistory } from './studio/StudioAuditHistory';
import { StudioPreviewCanvas } from './studio/StudioPreviewCanvas';
import { StudioProjectField } from './studio/StudioProjectField';
import { StudioSourceImageSelector } from './studio/StudioSourceImageSelector';
import { StudioVariantsGrid } from './studio/StudioVariantsGrid';
import { ProductStudioProvider, useProductStudioContext } from '../../context/ProductStudioContext';

function ProductFormStudioInner(): React.JSX.Element {
  const {
    activeRunId,
    auditEntries,
    imageSlotPreviews,
    pendingVariantPlaceholderCount,
    runStatus,
    selectedImageIndex,
    selectedVariantSlotId,
    sequenceReadinessMessage,
    studioProjectId,
    studioActionError: _studioActionError,
    variantsData,
  } = useProductStudioContext();
  const { product } = useProductFormCore();
  const registrySource = React.useMemo(() => {
    if (!product?.id) {
      return null;
    }

    const workspaceContextInput = {
      product,
      studioProjectId,
      selectedImageIndex,
      imageSlotPreviews,
      selectedVariantSlotId,
      variantsData,
      activeRunId,
      runStatus,
      pendingVariantPlaceholderCount,
      sequenceReadinessMessage,
      auditEntries,
    };

    return {
      label: 'Product Studio workspace state',
      resolved: buildProductStudioWorkspaceContextBundle(workspaceContextInput),
    };
  }, [
      activeRunId,
      auditEntries,
      imageSlotPreviews,
      pendingVariantPlaceholderCount,
      product,
      runStatus,
      selectedImageIndex,
      selectedVariantSlotId,
      sequenceReadinessMessage,
      studioProjectId,
      variantsData,
    ]);

  useRegisterContextRegistryPageSource('product-studio-workspace-state', registrySource);

  if (!studioProjectId) {
    return (
      <FormSection
        title='Studio'
        description='Connect this product to an Image Studio project to enable permanent listing generations.'
      >
        <StudioProjectField />
      </FormSection>
    );
  }

  if (!product?.id) {
    return (
      <FormSection
        title='Studio'
        description='Save the product first to start permanent Studio generations.'
      >
        <StudioProjectField />
      </FormSection>
    );
  }

  return (
    <div className='space-y-4'>
      <FormSection
        title='Studio'
        description='Pick a product image, send it to Studio, preview generated variants, then accept one.'
      >
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
    <ContextRegistryPageProvider
      pageId='admin:product-editor'
      title='Product Editor'
      rootNodeIds={[...PRODUCT_EDITOR_CONTEXT_ROOT_IDS]}
    >
      <ProductStudioProvider>
        <ProductFormStudioInner />
      </ProductStudioProvider>
    </ContextRegistryPageProvider>
  );
}
