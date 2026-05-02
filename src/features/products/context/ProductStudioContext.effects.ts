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

export const useProductStudioRunEffects = (
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
