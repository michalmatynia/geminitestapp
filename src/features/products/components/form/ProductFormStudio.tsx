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

type ProductStudioRegistrySource = {
  label: string;
  resolved: ReturnType<typeof buildProductStudioWorkspaceContextBundle>;
} | null;

const PRODUCT_EDITOR_CONTEXT_ROOT_NODE_IDS = [...PRODUCT_EDITOR_CONTEXT_ROOT_IDS];

function StudioUnavailableSection({ description }: { description: string }): React.JSX.Element {
  return (
    <FormSection title='Studio' description={description}>
      <StudioProjectField />
    </FormSection>
  );
}

function useProductStudioWorkspaceRegistrySource(): ProductStudioRegistrySource {
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
    variantsData,
  } = useProductStudioContext();
  const { product } = useProductFormCore();
  const productId = product?.id ?? '';

  return React.useMemo((): ProductStudioRegistrySource => {
    if (productId === '') return null;

    return {
      label: 'Product Studio workspace state',
      resolved: buildProductStudioWorkspaceContextBundle({
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
      }),
    };
  }, [
    activeRunId,
    auditEntries,
    imageSlotPreviews,
    pendingVariantPlaceholderCount,
    product,
    productId,
    runStatus,
    selectedImageIndex,
    selectedVariantSlotId,
    sequenceReadinessMessage,
    studioProjectId,
    variantsData,
  ]);
}

function ProductFormStudioInner(): React.JSX.Element {
  const { studioProjectId } = useProductStudioContext();
  const { product } = useProductFormCore();
  const productId = product?.id ?? '';
  const registrySource = useProductStudioWorkspaceRegistrySource();

  useRegisterContextRegistryPageSource('product-studio-workspace-state', registrySource);

  if (studioProjectId === null || studioProjectId === '') {
    return (
      <StudioUnavailableSection description='Connect this product to an Image Studio project to enable permanent listing generations.' />
    );
  }

  if (productId === '') {
    return (
      <StudioUnavailableSection description='Save the product first to start permanent Studio generations.' />
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
      rootNodeIds={PRODUCT_EDITOR_CONTEXT_ROOT_NODE_IDS}
    >
      <ProductStudioProvider>
        <ProductFormStudioInner />
      </ProductStudioProvider>
    </ContextRegistryPageProvider>
  );
}
