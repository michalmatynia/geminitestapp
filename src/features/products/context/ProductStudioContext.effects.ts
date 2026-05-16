'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  safeSetInterval,
  safeClearInterval,
  safeSetTimeout,
  safeClearTimeout,
} from '@/shared/lib/timers';

import { isProductStudioRunTerminalStatus } from './ProductStudioContext.constants';
import {
  clearActiveRunCacheForTarget,
  countProducedVariantsForRun,
  PRODUCT_STUDIO_RUN_TIMEOUT_MS,
  resolveRestorableActiveRun,
  resolveTerminalRunErrorMessage,
  type ProductStudioActiveRunInfo,
  type ProductStudioRunTarget,
} from './ProductStudioContext.run-effects';
import type { ProductStudioLoadedState, ProductStudioRunState } from './ProductStudioContext.types';

const VARIANT_POLL_INTERVAL_MS = 4000;

const resolveUnhandledTerminalActiveRun = (
  variantsData: ProductStudioLoadedState['variantsState']['variantsData'],
  currentHandledKey: string | null
): { activeRun: ProductStudioActiveRunInfo; handledKey: string } | null => {
  const activeRun = variantsData?.activeRun ?? null;
  if (activeRun === null) return null;
  if (!isProductStudioRunTerminalStatus(activeRun.runStatus)) return null;
  const handledKey = `${activeRun.runId}:${activeRun.runStatus}:${activeRun.errorMessage ?? ''}`;
  if (currentHandledKey === handledKey) return null;
  return { activeRun, handledKey };
};

const useProductStudioAutoPollEffect = (
  loaded: ProductStudioLoadedState,
  baselineIdsRef: React.MutableRefObject<string[]>,
  selectedVariantSlotIdRef: React.MutableRefObject<string | null>
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { refreshVariants, setSelectedVariantSlotId } = loaded.variantsState;

  useEffect(() => {
    if (pendingVariantPlaceholderCount === 0) return undefined;
    const id = safeSetInterval(() => {
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
    return () => safeClearInterval(id);
  }, [pendingVariantPlaceholderCount, refreshVariants, setSelectedVariantSlotId, baselineIdsRef, selectedVariantSlotIdRef]);
};

const useProductStudioStatusAdvanceEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { pendingExpectedOutputs, runStatus, setRunStatus } = runState;

  useEffect(() => {
    if (runStatus !== 'queued' || pendingExpectedOutputs === 0) return;
    const variantsArrived = pendingExpectedOutputs - pendingVariantPlaceholderCount;
    if (variantsArrived > 0) setRunStatus('running');
  }, [pendingExpectedOutputs, pendingVariantPlaceholderCount, runStatus, setRunStatus]);
};

const useProductStudioCompletionEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  prevPlaceholderCountRef: React.MutableRefObject<number>,
  target: ProductStudioRunTarget
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { refreshAudit } = loaded.auditState;
  const {
    activeRunId,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

  useEffect(() => {
    const placeholderCountRef = prevPlaceholderCountRef;
    const prev = placeholderCountRef.current;
    placeholderCountRef.current = pendingVariantPlaceholderCount;
    if (prev > 0 && pendingVariantPlaceholderCount === 0 && activeRunId !== null) {
      setRunStatus(null);
      setActiveRunId(null);
      setPendingExpectedOutputs(0);
      setActiveRunBaselineVariantIds([]);
      clearActiveRunCacheForTarget(target);
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
    target,
    prevPlaceholderCountRef,
  ]);
};

const useProductStudioTerminalActiveRunEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  target: ProductStudioRunTarget
): void => {
  const variantsData = loaded.variantsState.variantsData;
  const { refreshAudit } = loaded.auditState;
  const { setStudioActionError } = loaded.variantsState;
  const handledTerminalRunRef = useRef<string | null>(null);
  const {
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

  useEffect(() => {
    const terminalRun = resolveUnhandledTerminalActiveRun(
      variantsData,
      handledTerminalRunRef.current
    );
    if (terminalRun === null) return;
    handledTerminalRunRef.current = terminalRun.handledKey;

    setRunStatus(null);
    setActiveRunId(null);
    setPendingExpectedOutputs(0);
    setActiveRunBaselineVariantIds([]);
    clearActiveRunCacheForTarget(target);

    const message = resolveTerminalRunErrorMessage(
      terminalRun.activeRun,
      variantsData?.variants ?? []
    );
    if (message !== null) {
      setStudioActionError(message);
    }
    void refreshAudit();
  }, [
    handledTerminalRunRef,
    refreshAudit,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
    setStudioActionError,
    target,
    variantsData,
  ]);
};

const useProductStudioRestorationEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  target: ProductStudioRunTarget
): void => {
  const {
    activeRunId,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

  useEffect(() => {
    const variantsData = loaded.variantsState.variantsData;
    const currentVariants = variantsData?.variants ?? [];
    const activeRun = resolveRestorableActiveRun({ activeRunId, target, variantsData });
    if (activeRun === null) return;

    const alreadyArrived = countProducedVariantsForRun(activeRun, currentVariants);
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
    target,
  ]);
};

const useProductStudioTimeoutEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  target: ProductStudioRunTarget
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { setStudioActionError } = loaded.variantsState;
  const {
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

  useEffect(() => {
    if (pendingVariantPlaceholderCount === 0) return undefined;
    const id = safeSetTimeout(() => {
      setRunStatus(null);
      setActiveRunId(null);
      setPendingExpectedOutputs(0);
      setActiveRunBaselineVariantIds([]);
      clearActiveRunCacheForTarget(target);
      setStudioActionError('Studio generation timed out while waiting for generated variants.');
    }, PRODUCT_STUDIO_RUN_TIMEOUT_MS);
    return () => safeClearTimeout(id);
  }, [
    pendingVariantPlaceholderCount,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
    setStudioActionError,
    target,
  ]);
};

export const useProductStudioRunEffects = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
  productId: string | null,
  selectedImageIndex: number | null
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { selectedVariantSlotId } = loaded.variantsState;
  const { activeRunBaselineVariantIds } = runState;
  const target = useMemo(
    () => ({ productId, selectedImageIndex }),
    [productId, selectedImageIndex]
  );

  // Stable refs so interval callbacks read current values without effect churn
  const baselineIdsRef = useRef(activeRunBaselineVariantIds);
  baselineIdsRef.current = activeRunBaselineVariantIds;
  const selectedVariantSlotIdRef = useRef(selectedVariantSlotId);
  selectedVariantSlotIdRef.current = selectedVariantSlotId;
  const prevPlaceholderCountRef = useRef(pendingVariantPlaceholderCount);

  useProductStudioAutoPollEffect(loaded, baselineIdsRef, selectedVariantSlotIdRef);
  useProductStudioStatusAdvanceEffect(loaded, runState);
  useProductStudioCompletionEffect(loaded, runState, prevPlaceholderCountRef, target);
  useProductStudioTerminalActiveRunEffect(loaded, runState, target);
  useProductStudioRestorationEffect(loaded, runState, target);
  useProductStudioTimeoutEffect(loaded, runState, target);
};
