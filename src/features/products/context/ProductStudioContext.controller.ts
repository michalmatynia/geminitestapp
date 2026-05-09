'use client';

'use no memo';

import { useMemo, useState } from 'react';

import { useStudioProjects } from '@/features/ai/public';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';

import { useProductFormCore } from './ProductFormCoreContext';
import { useProductFormImages } from './ProductFormImageContext';
import { useProductFormStudio } from './ProductFormStudioContext';
import {
  useProductStudioActionHandlers,
  type ProductStudioActionHandlers,
} from './ProductStudioContext.actions';
import {
  useProductStudioAuditData,
  useProductStudioVariantsData,
} from './ProductStudioContext.data';
import { useProductStudioDerivedState } from './ProductStudioContext.derived';
import { useProductStudioRunEffects } from './ProductStudioContext.effects';
import {
  useProductImageSlotPreviews,
  useProductStudioInitialImageSelection,
} from './ProductStudioContext.previews';
import {
  useHydrateProductStudioProjectId,
  useProductStudioProjectOptions,
} from './ProductStudioContext.projects';
import {
  useProductStudioActionsValue,
  useProductStudioStateValue,
} from './ProductStudioContext.values';
import type {
  ProductStudioActionsContextValue,
  ProductStudioRunStatus,
  ProductStudioStateContextValue,
  ProductStudioRunState,
  ProductStudioBaseState,
  ProductStudioLoadedState,
} from './ProductStudioContext.types';

type ProductStudioProviderController = {
  actionsValue: ProductStudioActionsContextValue;
  stateValue: ProductStudioStateContextValue;
};

const useProductStudioRunState = (): ProductStudioRunState => {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<ProductStudioRunStatus | null>(null);
  const [activeRunBaselineVariantIds, setActiveRunBaselineVariantIds] = useState<string[]>([]);
  const [pendingExpectedOutputs, setPendingExpectedOutputs] = useState<number>(0);

  return {
    activeRunBaselineVariantIds,
    activeRunId,
    pendingExpectedOutputs,
    runStatus,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  };
};

const useProductStudioBaseState = (): ProductStudioBaseState => {
  const { studioProjectId, setStudioProjectId, studioConfigLoading, studioConfigSaving } =
    useProductFormStudio();
  const { product } = useProductFormCore();
  const { imageBase64s, imageLinks, imageSlots, refreshImagesFromProduct } = useProductFormImages();
  const studioProjectsQuery = useStudioProjects();
  const { defaultProjectId, getImageExternalBaseUrl } = useProductSettings();
  const productImagesExternalBaseUrl = getImageExternalBaseUrl();
  const productId = product?.id ?? null;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const { studioProjectIds, studioProjectOptions } = useProductStudioProjectOptions(
    studioProjectsQuery.data
  );
  useHydrateProductStudioProjectId({
    configuredDefaultStudioProjectId: defaultProjectId,
    setStudioProjectId,
    studioConfigLoading,
    studioConfigSaving,
    studioProjectId,
    studioProjectIds,
    studioProjectsLoading: studioProjectsQuery.isLoading,
  });

  const imageSlotPreviews = useProductImageSlotPreviews(
    imageSlots,
    imageLinks,
    imageBase64s,
    productImagesExternalBaseUrl
  );
  useProductStudioInitialImageSelection({
    imageSlotPreviews,
    selectedImageIndex,
    setSelectedImageIndex,
  });

  return {
    imageLinks,
    imageSlotPreviews,
    product,
    productId,
    productImagesExternalBaseUrl,
    refreshImagesFromProduct,
    selectedImageIndex,
    setSelectedImageIndex,
    setStudioProjectId,
    studioConfigLoading,
    studioProjectId,
    studioProjectOptions,
    studioProjectsLoading: studioProjectsQuery.isLoading,
  };
};

const useProductStudioLoadedState = (
  base: ProductStudioBaseState,
  runState: ProductStudioRunState
): ProductStudioLoadedState => {
  const variantsState = useProductStudioVariantsData({
    productId: base.productId,
    selectedImageIndex: base.selectedImageIndex,
    studioProjectId: base.studioProjectId,
  });
  const auditState = useProductStudioAuditData({
    productId: base.productId,
    selectedImageIndex: base.selectedImageIndex,
    studioProjectId: base.studioProjectId,
  });

  const derivedState = useProductStudioDerivedState({
    product: base.product,
    studioProjectId: base.studioProjectId,
    selectedImageIndex: base.selectedImageIndex,
    imageSlotPreviews: base.imageSlotPreviews,
    productImagesExternalBaseUrl: base.productImagesExternalBaseUrl,
    selectedVariantSlotId: variantsState.selectedVariantSlotId,
    variantsData: variantsState.variantsData,
    activeRunId: runState.activeRunId,
    runStatus: runState.runStatus,
    activeRunBaselineVariantIds: runState.activeRunBaselineVariantIds,
    pendingExpectedOutputs: runState.pendingExpectedOutputs,
    auditEntries: auditState.auditEntries,
  });

  useRegisterContextRegistryPageSource(
    'product-studio-workspace-state',
    derivedState.registrySource
  );

  return { auditState, derivedState, variantsState };
};

const useProductStudioActionArgs = (
  base: ProductStudioBaseState,
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): Parameters<typeof useProductStudioActionHandlers>[0] => {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  return useMemo(
    () => ({
      contextRegistry,
      imageLinks: base.imageLinks,
      productId: base.productId,
      refreshAudit: loaded.auditState.refreshAudit,
      refreshImagesFromProduct: base.refreshImagesFromProduct,
      refreshVariants: loaded.variantsState.refreshVariants,
      selectedImageIndex: base.selectedImageIndex,
      selectedVariantSlotId: loaded.variantsState.selectedVariantSlotId,
      setActiveRunBaselineVariantIds: runState.setActiveRunBaselineVariantIds,
      setActiveRunId: runState.setActiveRunId,
      setPendingExpectedOutputs: runState.setPendingExpectedOutputs,
      setRunStatus: runState.setRunStatus,
      setStudioActionError: loaded.variantsState.setStudioActionError,
      studioProjectId: base.studioProjectId,
      variantsData: loaded.variantsState.variantsData,
    }),
    [
      base.imageLinks,
      base.productId,
      base.refreshImagesFromProduct,
      base.selectedImageIndex,
      base.studioProjectId,
      contextRegistry,
      loaded.auditState.refreshAudit,
      loaded.variantsState.refreshVariants,
      loaded.variantsState.selectedVariantSlotId,
      loaded.variantsState.setStudioActionError,
      loaded.variantsState.variantsData,
      runState.setActiveRunBaselineVariantIds,
      runState.setActiveRunId,
      runState.setPendingExpectedOutputs,
      runState.setRunStatus,
    ]
  );
};

const useProductStudioContextValues = (
  base: ProductStudioBaseState,
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  handlers: ProductStudioActionHandlers
): ProductStudioProviderController => {
  const stateValue = useProductStudioStateValue({
    ...loaded.derivedState,
    accepting: handlers.accepting,
    activeRunId: runState.activeRunId,
    auditEntries: loaded.auditState.auditEntries,
    auditError: loaded.auditState.auditError,
    auditLoading: loaded.auditState.auditLoading,
    deletingVariantId: handlers.deletingVariantId,
    convertingLinkImageIndex: handlers.convertingLinkImageIndex,
    imageSlotPreviews: base.imageSlotPreviews,
    isStudioLoading: base.studioProjectsLoading || base.studioConfigLoading,
    openingInImageStudio: handlers.openingInImageStudio,
    rotatingDirection: handlers.rotatingDirection,
    pendingExpectedOutputs: runState.pendingExpectedOutputs,
    runStatus: runState.runStatus,
    selectedImageIndex: base.selectedImageIndex,
    selectedVariantSlotId: loaded.variantsState.selectedVariantSlotId,
    sending: handlers.sending,
    studioActionError: loaded.variantsState.studioActionError,
    studioProjectId: base.studioProjectId,
    studioProjectOptions: base.studioProjectOptions,
    variantsData: loaded.variantsState.variantsData,
    variantsLoading: loaded.variantsState.variantsLoading,
  });
  const actionsValue = useProductStudioActionsValue({
    ...handlers,
    refreshAudit: loaded.auditState.refreshAudit,
    refreshVariants: loaded.variantsState.refreshVariants,
    setSelectedImageIndex: base.setSelectedImageIndex,
    setSelectedVariantSlotId: loaded.variantsState.setSelectedVariantSlotId,
    setStudioProjectId: base.setStudioProjectId,
  });

  return { actionsValue, stateValue };
};

export const useProductStudioProviderController = (): ProductStudioProviderController => {
  const base = useProductStudioBaseState();
  const runState = useProductStudioRunState();
  const loaded = useProductStudioLoadedState(base, runState);
  const actionArgs = useProductStudioActionArgs(base, loaded, runState);
  const handlers = useProductStudioActionHandlers(actionArgs);
  useProductStudioRunEffects(loaded, runState, base.productId, base.selectedImageIndex);
  return useProductStudioContextValues(base, loaded, runState, handlers);
};
