/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { saveObjectLayoutAdvancedDefaults } from '../../utils/object-layout-presets';
import {
  IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT,
  clearImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisPlanSnapshot,
} from '../../utils/analysis-bridge';
import { type GenerationToolbarState } from './GenerationToolbar.types';

export function useGenerationToolbarEffects(
  state: GenerationToolbarState,
  actions: {
    handleCenterObject: () => Promise<void>;
    handleAutoScale: () => Promise<void>;
  }
) {
  const {
    activeProjectId,
    centerLayoutDetection,
    centerLayoutShadowPolicy,
    centerLayoutWhiteThresholdValue,
    centerLayoutChromaThresholdValue,
    skipCenterAdvancedDefaultsSaveRef,
    setAnalysisPlanSnapshot,
    slots,
    slotSelectionLocked,
    workingSlot,
    setSelectedSlotId,
    setWorkingSlotId,
    toast,
    workingSourceSignature,
    applyAnalysisLayoutToCenter,
    applyAnalysisLayoutToAutoScaler,
    lastConsumedAnalysisIntentRef,
    queuedAnalysisRunTarget,
    setQueuedAnalysisRunTarget,
    centerBusy,
    centerRequestInFlightRef,
    autoScaleBusy,
    autoScaleRequestInFlightRef,
  } = state;

  const { handleCenterObject, handleAutoScale } = actions;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncAnalysisPlanSnapshot = (): void => {
      setAnalysisPlanSnapshot(loadImageStudioAnalysisPlanSnapshot(activeProjectId));
    };
    const handleBridgeUpdate = (): void => {
      syncAnalysisPlanSnapshot();
    };
    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key &&
        !event.key.includes('image_studio_analysis_plan_snapshot_') &&
        event.key !== 'image_studio_analysis_plan_snapshot_session'
      ) {
        return;
      }
      syncAnalysisPlanSnapshot();
    };

    syncAnalysisPlanSnapshot();
    window.addEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, handleBridgeUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, handleBridgeUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId, setAnalysisPlanSnapshot]);

  useEffect(() => {
    const intent = loadImageStudioAnalysisApplyIntent(activeProjectId);
    if (!intent) return;

    const intentKey = [
      intent.createdAt,
      intent.slotId,
      intent.sourceSignature,
      intent.target,
      intent.runAfterApply ? '1' : '0',
    ].join('|');
    if (lastConsumedAnalysisIntentRef.current === intentKey) return;

    if (slotSelectionLocked) {
      lastConsumedAnalysisIntentRef.current = intentKey;
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      toast('Cannot apply while slot selection is locked.', { variant: 'info' });
      return;
    }

    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const normalizedIntentSlotId = intent.slotId?.trim() ?? '';

    const intentSlotExists = slots.some(
      (slot) => (slot.id ?? '').trim() === normalizedIntentSlotId
    );
    if (!intentSlotExists) {
      lastConsumedAnalysisIntentRef.current = intentKey;
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      toast('Analyzed slot no longer exists.', { variant: 'info' });
      return;
    }

    if (!normalizedWorkingSlotId || normalizedIntentSlotId !== normalizedWorkingSlotId) {
      setSelectedSlotId(normalizedIntentSlotId);
      setWorkingSlotId(normalizedIntentSlotId);
      return;
    }

    const normalizedIntentSourceSignature = intent.sourceSignature?.trim() ?? '';
    if (
      normalizedIntentSourceSignature &&
      !workingSourceSignature
    ) {
      lastConsumedAnalysisIntentRef.current = intentKey;
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      toast('Working slot source metadata is missing. Reselect slot image and retry.', {
        variant: 'info',
      });
      return;
    }
    if (
      normalizedIntentSourceSignature &&
      normalizedIntentSourceSignature !== workingSourceSignature
    ) {
      lastConsumedAnalysisIntentRef.current = intentKey;
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      toast('Analysis plan is stale for this slot image. Run analysis again.', { variant: 'info' });
      return;
    }

    lastConsumedAnalysisIntentRef.current = intentKey;
    if (intent.target === 'object_layout') {
      applyAnalysisLayoutToCenter(intent.layout, intent.runAfterApply ? 'auto' : 'manual');
    } else {
      applyAnalysisLayoutToAutoScaler(intent.layout, intent.runAfterApply ? 'auto' : 'manual');
    }
    clearImageStudioAnalysisApplyIntent(activeProjectId);
  }, [
    activeProjectId,
    applyAnalysisLayoutToAutoScaler,
    applyAnalysisLayoutToCenter,
    lastConsumedAnalysisIntentRef,
    setSelectedSlotId,
    setWorkingSlotId,
    slotSelectionLocked,
    slots,
    toast,
    workingSlot?.id,
    workingSourceSignature,
  ]);

  useEffect(() => {
    if (skipCenterAdvancedDefaultsSaveRef.current) {
      skipCenterAdvancedDefaultsSaveRef.current = false;
      return;
    }
    void (async () => {
      await saveObjectLayoutAdvancedDefaults(activeProjectId, {
        detection: centerLayoutDetection,
        shadowPolicy: centerLayoutShadowPolicy,
        whiteThreshold: centerLayoutWhiteThresholdValue,
        chromaThreshold: centerLayoutChromaThresholdValue,
      });
    })();
  }, [
    activeProjectId,
    centerLayoutChromaThresholdValue,
    centerLayoutDetection,
    centerLayoutShadowPolicy,
    centerLayoutWhiteThresholdValue,
    skipCenterAdvancedDefaultsSaveRef,
  ]);

  useEffect(() => {
    if (!queuedAnalysisRunTarget) return;
    if (queuedAnalysisRunTarget === 'object_layout') {
      if (centerBusy || centerRequestInFlightRef.current) return;
      setQueuedAnalysisRunTarget(null);
      void (async () => { await handleCenterObject(); })();
      return;
    }
    if (autoScaleBusy || autoScaleRequestInFlightRef.current) return;
    setQueuedAnalysisRunTarget(null);
    void (async () => { await handleAutoScale(); })();
  }, [
    autoScaleBusy,
    centerBusy,
    handleAutoScale,
    handleCenterObject,
    queuedAnalysisRunTarget,
    setQueuedAnalysisRunTarget,
    autoScaleRequestInFlightRef,
    centerRequestInFlightRef,
  ]);
}
