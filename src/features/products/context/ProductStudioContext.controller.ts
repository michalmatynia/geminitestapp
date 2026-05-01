'use client';

'use no memo';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

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
  type ProductStudioAuditData,
  type ProductStudioVariantsData,
} from './ProductStudioContext.data';
import { useProductStudioDerivedState } from './ProductStudioContext.derived';
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
} from './ProductStudioContext.types';

type ProductStudioProviderController = {
  actionsValue: ProductStudioActionsContextValue;
  stateValue: ProductStudioStateContextValue;
};

type ProductStudioRunState = {
  activeRunBaselineVariantIds: string[];
  activeRunId: string | null;
  pendingExpectedOutputs: number;
  runStatus: ProductStudioRunStatus | null;
  setActiveRunBaselineVariantIds: Dispatch<SetStateAction<string[]>>;
  setActiveRunId: Dispatch<SetStateAction<string | null>>;
  setPendingExpectedOutputs: Dispatch<SetStateAction<number>>;
  setRunStatus: Dispatch<SetStateAction<ProductStudioRunStatus | null>>;
};

type ProductStudioBaseState = {
  imageLinks: string[];
  imageSlotPreviews: ReturnType<typeof useProductImageSlotPreviews>;
  product: ReturnType<typeof useProductFormCore>['product'];
  productId: string | null;
  productImagesExternalBaseUrl: string;
  refreshImagesFromProduct: ReturnType<typeof useProductFormImages>['refreshImagesFromProduct'];
  selectedImageIndex: number | null;
  setSelectedImageIndex: Dispatch<SetStateAction<number | null>>;
  setStudioProjectId: (id: string | null) => void;
  studioConfigLoading: boolean;
  studioProjectId: string | null;
  studioProjectOptions: ReturnType<typeof useProductStudioProjectOptions>['studioProjectOptions'];
  studioProjectsLoading: boolean;
};

type ProductStudioLoadedState = {
  auditState: ProductStudioAuditData;
  derivedState: ReturnType<typeof useProductStudioDerivedState>;
  variantsState: ProductStudioVariantsData;
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

const VARIANT_POLL_INTERVAL_MS = 4000;
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

const useProductStudioRunEffects = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { refreshVariants, selectedVariantSlotId, setSelectedVariantSlotId } = loaded.variantsState;
  const { refreshAudit } = loaded.auditState;
  const {
    activeRunId,
    activeRunBaselineVariantIds,
    pendingExpectedOutputs,
    runStatus,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

  // Stable refs so interval callbacks read current values without effect churn
  const baselineIdsRef = useRef(activeRunBaselineVariantIds);
  baselineIdsRef.current = activeRunBaselineVariantIds;
  const selectedVariantSlotIdRef = useRef(selectedVariantSlotId);
  selectedVariantSlotIdRef.current = selectedVariantSlotId;
  const prevPlaceholderCountRef = useRef(pendingVariantPlaceholderCount);

  // Auto-poll variants while generation is in progress; auto-select first new variant
  useEffect(() => {
    if (pendingVariantPlaceholderCount === 0) return;
    const id = setInterval(() => {
      refreshVariants()
        .then((result) => {
          if (result === null) return;
          const baselineSet = new Set(baselineIdsRef.current);
          const currentIsBaseline =
            selectedVariantSlotIdRef.current === null ||
            baselineSet.has(selectedVariantSlotIdRef.current);
          if (!currentIsBaseline) return;
          const firstNew = result.variants.find((slot) => !baselineSet.has(slot.id));
          if (firstNew !== undefined) setSelectedVariantSlotId(firstNew.id);
        })
        .catch(() => undefined);
    }, VARIANT_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pendingVariantPlaceholderCount, refreshVariants, setSelectedVariantSlotId]);

  // Advance status from 'queued' to 'running' once the first output variant arrives
  useEffect(() => {
    if (runStatus !== 'queued' || pendingExpectedOutputs === 0) return;
    const variantsArrived = pendingExpectedOutputs - pendingVariantPlaceholderCount;
    if (variantsArrived > 0) setRunStatus('running');
  }, [pendingExpectedOutputs, pendingVariantPlaceholderCount, runStatus, setRunStatus]);

  // Clear run state and refresh audit once all expected variants have arrived
  useEffect(() => {
    const prev = prevPlaceholderCountRef.current;
    prevPlaceholderCountRef.current = pendingVariantPlaceholderCount;
    if (prev > 0 && pendingVariantPlaceholderCount === 0 && activeRunId !== null) {
      setRunStatus(null);
      setActiveRunId(null);
      setPendingExpectedOutputs(0);
      setActiveRunBaselineVariantIds([]);
      void refreshAudit();
    }
  }, [
    activeRunId,
    pendingVariantPlaceholderCount,
    refreshAudit,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  ]);

  // Restore run state from Redis-persisted active run on modal reopen.
  // Skip restoration if all expected variants have already arrived to avoid
  // a phantom "running" badge when the user reopens after a completed run.
  useEffect(() => {
    const activeRun = loaded.variantsState.variantsData?.activeRun ?? null;
    if (activeRun === null || activeRunId !== null) return;
    const currentVariants = loaded.variantsState.variantsData?.variants ?? [];
    const baselineSet = new Set(activeRun.baselineVariantIds);
    const alreadyArrived = currentVariants.filter((v) => !baselineSet.has(v.id)).length;
    if (alreadyArrived >= activeRun.pendingExpectedOutputs) return;
    setActiveRunId(activeRun.runId);
    setRunStatus(activeRun.runStatus);
    setPendingExpectedOutputs(activeRun.pendingExpectedOutputs);
    setActiveRunBaselineVariantIds(activeRun.baselineVariantIds);
  }, [
    activeRunId,
    loaded.variantsState.variantsData,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  ]);

  // Safety timeout: force-clear run state if the server run never delivers all expected outputs
  useEffect(() => {
    if (pendingVariantPlaceholderCount === 0) return;
    const id = setTimeout(() => {
      setRunStatus(null);
      setActiveRunId(null);
      setPendingExpectedOutputs(0);
      setActiveRunBaselineVariantIds([]);
    }, RUN_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [
    pendingVariantPlaceholderCount,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  ]);
};

export const useProductStudioProviderController = (): ProductStudioProviderController => {
  const base = useProductStudioBaseState();
  const runState = useProductStudioRunState();
  const loaded = useProductStudioLoadedState(base, runState);
  const actionArgs = useProductStudioActionArgs(base, loaded, runState);
  const handlers = useProductStudioActionHandlers(actionArgs);
  useProductStudioRunEffects(loaded, runState);
  return useProductStudioContextValues(base, loaded, runState, handlers);
};
