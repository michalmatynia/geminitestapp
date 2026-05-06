'use client';

import { useEffect, useRef } from 'react';

import {
  safeSetInterval,
  safeClearInterval,
  safeSetTimeout,
  safeClearTimeout,
} from '@/shared/lib/timers';

import type { ProductStudioLoadedState, ProductStudioRunState } from './ProductStudioContext.types';

const VARIANT_POLL_INTERVAL_MS = 4000;
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

const useProductStudioAutoPollEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState,
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
  prevPlaceholderCountRef: React.MutableRefObject<number>
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
    const prev = prevPlaceholderCountRef.current;
    // eslint-disable-next-line no-param-reassign
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
    prevPlaceholderCountRef,
  ]);
};

const useProductStudioRestorationEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): void => {
  const {
    activeRunId,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  } = runState;

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
};

const useProductStudioTimeoutEffect = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
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
    }, RUN_TIMEOUT_MS);
    return () => safeClearTimeout(id);
  }, [
    pendingVariantPlaceholderCount,
    setActiveRunBaselineVariantIds,
    setActiveRunId,
    setPendingExpectedOutputs,
    setRunStatus,
  ]);
};

export const useProductStudioRunEffects = (
  loaded: ProductStudioLoadedState,
  runState: ProductStudioRunState
): void => {
  const { pendingVariantPlaceholderCount } = loaded.derivedState;
  const { selectedVariantSlotId } = loaded.variantsState;
  const { activeRunBaselineVariantIds } = runState;

  // Stable refs so interval callbacks read current values without effect churn
  const baselineIdsRef = useRef(activeRunBaselineVariantIds);
  baselineIdsRef.current = activeRunBaselineVariantIds;
  const selectedVariantSlotIdRef = useRef(selectedVariantSlotId);
  selectedVariantSlotIdRef.current = selectedVariantSlotId;
  const prevPlaceholderCountRef = useRef(pendingVariantPlaceholderCount);

  useProductStudioAutoPollEffect(loaded, runState, baselineIdsRef, selectedVariantSlotIdRef);
  useProductStudioStatusAdvanceEffect(loaded, runState);
  useProductStudioCompletionEffect(loaded, runState, prevPlaceholderCountRef);
  useProductStudioRestorationEffect(loaded, runState);
  useProductStudioTimeoutEffect(loaded, runState);
};
