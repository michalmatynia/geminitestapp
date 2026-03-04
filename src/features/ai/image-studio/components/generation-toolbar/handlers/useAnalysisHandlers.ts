'use client';

import { useCallback, useRef } from 'react';
import { api } from '@/shared/lib/api-client';
import {
  imageStudioAnalysisResponseSchema,
  type ImageStudioCenterLayoutConfig,
  type ImageStudioAnalysisResponse,
} from '../../../contracts/analysis';
import type { AnalysisResult } from '../../analysis/analysis-types';
import { analyzeCanvasImageObject } from '../GenerationToolbarImageUtils';
import {
  saveImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisSharedLayout,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import {
  type GenerationToolbarState,
  type GenerationToolbarHelpers,
} from '../GenerationToolbar.types';

const ANALYSIS_REQUEST_TIMEOUT_MS = 60000;

export function useAnalysisHandlers(
  state: GenerationToolbarState,
  _helpers: GenerationToolbarHelpers
) {
  const {
    workingSlot,
    activeProjectId,
    toast,
    setAnalysisBusy,
    setAnalysisStatus,
    workingSlotImageSrc,
    clientProcessingImageSrc,
    setAnalysisPlanSnapshot,
    applyAnalysisLayoutToCenter,
    applyAnalysisLayoutToAutoScaler,
    centerLayoutPayload,
    autoScaleLayoutPayload,
  } = state;

  const abortControllerRef = useRef<AbortController | null>(null);

  const toSharedLayout = (layout: AnalysisResult['layout']): ImageStudioAnalysisSharedLayout => {
    const splitAxes = Math.abs(layout.paddingXPercent - layout.paddingYPercent) >= 0.01;
    return {
      paddingPercent: layout.paddingPercent,
      paddingXPercent: layout.paddingXPercent,
      paddingYPercent: layout.paddingYPercent,
      splitAxes,
      fillMissingCanvasWhite: layout.fillMissingCanvasWhite,
      targetCanvasWidth: layout.targetCanvasWidth,
      targetCanvasHeight: layout.targetCanvasHeight,
      whiteThreshold: layout.whiteThreshold,
      chromaThreshold: layout.chromaThreshold,
      shadowPolicy: layout.shadowPolicy,
      detection: layout.detection,
    };
  };

  const runAnalysis = async (
    mode: 'server_analysis_v1' | 'client_analysis_v1',
    layout: ImageStudioCenterLayoutConfig
  ): Promise<void> => {
    const slotId = workingSlot?.id?.trim() ?? '';
    if (!slotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before analysis.', { variant: 'info' });
      return;
    }

    const sourceSignature = state.workingSourceSignature;

    if (!sourceSignature) {
      toast('Unable to capture source signature for analysis. Reselect slot image and retry.', {
        variant: 'info',
      });
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setAnalysisBusy(true);
    setAnalysisStatus('resolving');

    try {
      let nextResult: AnalysisResult;
      if (mode === 'client_analysis_v1') {
        const source = clientProcessingImageSrc || workingSlotImageSrc;
        if (!source) {
          throw new Error('No client image source is available for analysis.');
        }
        setAnalysisStatus('processing');
        const analysis = await analyzeCanvasImageObject(source, layout);
        nextResult = {
          ...analysis,
          effectiveMode: 'client_analysis_v1',
          authoritativeSource: 'client_upload',
        };
      } else {
        setAnalysisStatus('processing');
        const response: ImageStudioAnalysisResponse = await api
          .post<unknown>(
            `/api/image-studio/slots/${encodeURIComponent(slotId)}/analysis`,
            {
              mode,
              layout,
            },
            {
              signal: abortController.signal,
              timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
            }
          )
          .then((raw) => imageStudioAnalysisResponseSchema.parse(raw));
        nextResult = {
          ...response.analysis,
          effectiveMode: response.effectiveMode,
          authoritativeSource: response.authoritativeSource,
        };
      }

      const sharedLayout = toSharedLayout(nextResult.layout);

      if (activeProjectId) {
        saveImageStudioAnalysisPlanSnapshot(activeProjectId, {
          slotId,
          sourceSignature,
          savedAt: new Date().toISOString(),
          layout: sharedLayout,
          effectiveMode: nextResult.effectiveMode,
          authoritativeSource: nextResult.authoritativeSource,
          detectionUsed: nextResult.detectionUsed,
          confidence: nextResult.confidence,
          policyVersion: nextResult.policyVersion,
          policyReason: nextResult.policyReason,
          fallbackApplied: nextResult.fallbackApplied,
        });
      }

      setAnalysisPlanSnapshot({
        ...nextResult,
        version: 1,
        slotId,
        sourceSignature,
        savedAt: new Date().toISOString(),
        layout: sharedLayout,
      });

      applyAnalysisLayoutToCenter(sharedLayout, 'manual');
      applyAnalysisLayoutToAutoScaler(sharedLayout, 'manual');

      const isClient = state.centerMode.startsWith('client_');
      const preferredCenterMode = isClient ? 'client_object_layout_v1' : 'server_object_layout_v1';

      // Handle center mode switching if needed
      if (
        state.centerMode.startsWith('client_alpha') ||
        state.centerMode.startsWith('server_alpha')
      ) {
        state.setCenterMode(preferredCenterMode);
      }

      toast('Analysis completed and synced to tools.', { variant: 'success' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast('Image analysis canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to analyze image.', {
        variant: 'error',
      });
    } finally {
      abortControllerRef.current = null;
      setAnalysisBusy(false);
      setAnalysisStatus('idle');
    }
  };

  const handleRunAnalysisFromCenter = useCallback(async () => {
    await runAnalysis('server_analysis_v1', centerLayoutPayload);
  }, [centerLayoutPayload, runAnalysis]);

  const handleRunAnalysisFromAutoScaler = useCallback(async () => {
    await runAnalysis('server_analysis_v1', autoScaleLayoutPayload);
  }, [autoScaleLayoutPayload, runAnalysis]);

  const handleCancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    handleRunAnalysisFromCenter,
    handleRunAnalysisFromAutoScaler,
    handleCancelAnalysis,
  };
}
