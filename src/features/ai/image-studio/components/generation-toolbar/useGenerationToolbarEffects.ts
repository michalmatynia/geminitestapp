/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { saveObjectLayoutAdvancedDefaults } from '../../utils/object-layout-presets';
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
    queuedAnalysisRunTarget,
    setQueuedAnalysisRunTarget,
    centerBusy,
    centerRequestInFlightRef,
    autoScaleBusy,
    autoScaleRequestInFlightRef,
  } = state;

  const { handleCenterObject, handleAutoScale } = actions;

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
