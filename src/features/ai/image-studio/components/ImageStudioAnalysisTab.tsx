'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildImageStudioAnalysisSourceSignature,
  IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT,
  loadImageStudioAnalysisPlanSnapshot,
  saveImageStudioAnalysisApplyIntent,
  type ImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisSharedLayout,
  saveImageStudioAnalysisPlanSnapshot,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import {
  buildObjectLayoutPresetOptions,
  deleteObjectLayoutCustomPreset,
  getObjectLayoutPresetValuesFromOption,
  IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
  resolveCustomPresetIdFromOptionValue,
  resolveObjectLayoutPresetOptionValue,
  saveObjectLayoutCustomPreset,
  saveObjectLayoutAdvancedDefaults,
  type ObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '@/features/ai/image-studio/utils/object-layout-presets';
import { api } from '@/shared/lib/api-client';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/shared/lib/products/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Card, useToast } from '@/shared/ui/primitives.public';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { imageStudioAnalysisResponseSchema } from '../contracts/analysis';
import {
  type AnalysisMode,
  type AnalysisStatus,
  type ShadowPolicy,
  type DetectionMode,
  type AnalysisResult,
  PADDING_DEFAULT,
  WHITE_THRESHOLD_DEFAULT,
  WHITE_THRESHOLD_MIN,
  WHITE_THRESHOLD_MAX,
  CHROMA_THRESHOLD_DEFAULT,
  CHROMA_THRESHOLD_MIN,
  CHROMA_THRESHOLD_MAX,
  ANALYSIS_REQUEST_TIMEOUT_MS,
} from './analysis/analysis-types';
import { useAiPathsObjectAnalysis } from '../hooks/useAiPathsObjectAnalysis';
import {
  AiPathAnalysisTriggerProvider,
  AiPathAnalysisTriggerSection,
} from './analysis/sections/AiPathAnalysisTriggerSection';
import { AnalysisResultSection } from './analysis/sections/AnalysisResultSection';
import {
  AnalysisSettingsSection,
  type AnalysisSettingsSectionConfig,
} from './analysis/sections/AnalysisSettingsSection';
import { CustomTriggerButtonsSection } from './analysis/sections/CustomTriggerButtonsSection';
import { ImageStudioAnalysisRuntimeProvider } from './analysis/sections/ImageStudioAnalysisRuntimeContext';
import {
  analyzeCanvasImageObject,
  resolveClientProcessingImageSrc,
} from './generation-toolbar/GenerationToolbarImageUtils';
import { useRightSidebarContext } from './RightSidebarContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';




const sanitizePaddingInput = (value: string): string => value.replace(/[^0-9.]/g, '');
const sanitizeThresholdInput = (value: string): string => value.replace(/[^0-9]/g, '');

const normalizePaddingPercent = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return PADDING_DEFAULT;
  return Math.max(0, Math.min(40, Number(parsed.toFixed(2))));
};

const normalizeThreshold = (value: string, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export function ImageStudioAnalysisTab(): React.JSX.Element {
  const { toast } = useToast();
  const { switchToControls } = useRightSidebarContext();
  const settingsStore = useSettingsStore();
  const { projectId, projectsQuery } = useProjectsState();
  const { slots, slotSelectionLocked, workingSlot } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const [mode, setMode] = useState<AnalysisMode>('server_analysis');
  const [layoutPadding, setLayoutPadding] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingX, setLayoutPaddingX] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingY, setLayoutPaddingY] = useState<string>(String(PADDING_DEFAULT));
  const [layoutSplitAxes, setLayoutSplitAxes] = useState(false);
  const [layoutAdvancedEnabled, setLayoutAdvancedEnabled] = useState(false);
  const [layoutDetection, setLayoutDetection] = useState<DetectionMode>('auto');
  const [layoutWhiteThreshold, setLayoutWhiteThreshold] = useState<string>(
    String(WHITE_THRESHOLD_DEFAULT)
  );
  const [layoutChromaThreshold, setLayoutChromaThreshold] = useState<string>(
    String(CHROMA_THRESHOLD_DEFAULT)
  );
  const [layoutFillMissingCanvasWhite, setLayoutFillMissingCanvasWhite] = useState(false);
  const [layoutShadowPolicy, setLayoutShadowPolicy] = useState<ShadowPolicy>('auto');
  const [layoutCustomPresets, setLayoutCustomPresets] = useState<ObjectLayoutCustomPreset[]>([]);
  const [layoutPresetDraftName, setLayoutPresetDraftName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultSourceSlotId, setResultSourceSlotId] = useState('');
  const [resultSourceSignature, setResultSourceSignature] = useState('');
  const [persistedPlanSnapshot, setPersistedPlanSnapshot] =
    useState<ImageStudioAnalysisPlanSnapshot | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const skipAdvancedDefaultsSaveRef = useRef(true);
  const selectedCustomPresetIdRef = useRef<string | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);
  const clientProcessingImageSrc = useMemo(
    () => resolveClientProcessingImageSrc(workingSlot, workingSlotImageSrc),
    [workingSlot, workingSlotImageSrc]
  );
  const buildSlotSourceSignature = useCallback(
    (slot: typeof workingSlot): string => {
      const slotId = slot?.id?.trim() ?? '';
      if (!slotId) return '';
      const slotImageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
      const slotClientProcessingImageSrc = resolveClientProcessingImageSrc(slot, slotImageSrc);
      const hasSourceMetadata = Boolean(
        slot?.imageFileId ??
        slot?.imageFile ??
        slot?.imageUrl ??
        slot?.imageBase64 ??
        slotImageSrc ??
        slotClientProcessingImageSrc
      );
      if (!hasSourceMetadata) return '';
      return buildImageStudioAnalysisSourceSignature({
        slotId,
        imageFileId: slot?.imageFileId ?? null,
        imageFile: slot?.imageFile ?? null,
        imageUrl: slot?.imageUrl ?? null,
        imageBase64: slot?.imageBase64 ?? null,
        resolvedImageSrc: slotImageSrc,
        clientProcessingImageSrc: slotClientProcessingImageSrc,
      });
    },
    [productImagesExternalBaseUrl]
  );

  const activeProject = useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === projectId) ?? null,
    [projectId, projectsQuery.data]
  );
  const activeProjectId = projectId?.trim() ?? '';
  const projectCanvasSize = useMemo((): { width: number; height: number } | null => {
    const width =
      typeof activeProject?.canvasWidthPx === 'number' &&
      Number.isFinite(activeProject.canvasWidthPx)
        ? Math.floor(activeProject.canvasWidthPx)
        : null;
    const height =
      typeof activeProject?.canvasHeightPx === 'number' &&
      Number.isFinite(activeProject.canvasHeightPx)
        ? Math.floor(activeProject.canvasHeightPx)
        : null;
    if (width === null || height === null) return null;
    if (width < 64 || width > 32_768 || height < 64 || height > 32_768) return null;
    return { width, height };
  }, [activeProject?.canvasHeightPx, activeProject?.canvasWidthPx]);

  const aiPathsAnalysis = useAiPathsObjectAnalysis({
    projectId: activeProjectId,
    workingSlotId: workingSlot?.id ?? null,
    workingSlotImageSrc: workingSlotImageSrc ?? null,
    workingSlotImageWidth: workingSlot?.width ?? null,
    workingSlotImageHeight: workingSlot?.height ?? null,
    canvasWidth: projectCanvasSize?.width ?? null,
    canvasHeight: projectCanvasSize?.height ?? null,
  });

  useEffect(() => {
    skipAdvancedDefaultsSaveRef.current = true;
    selectedCustomPresetIdRef.current = null;
    setLayoutPresetDraftName('');
    setLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    const persistedDefaults = loadObjectLayoutAdvancedDefaults(activeProjectId);
    if (!persistedDefaults) return;
    setLayoutDetection(persistedDefaults.detection);
    setLayoutShadowPolicy(persistedDefaults.shadowPolicy);
    setLayoutWhiteThreshold(String(persistedDefaults.whiteThreshold));
    setLayoutChromaThreshold(String(persistedDefaults.chromaThreshold));
  }, [activeProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncCustomPresets = (): void => {
      setLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    };
    const handleStorage = (event: StorageEvent): void => {
      if (event.key && !event.key.includes('image_studio_object_layout_custom_presets_')) return;
      syncCustomPresets();
    };
    syncCustomPresets();
    window.addEventListener(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT, syncCustomPresets);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(
        IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
        syncCustomPresets
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPersistedSnapshot = (): void => {
      setPersistedPlanSnapshot(loadImageStudioAnalysisPlanSnapshot(activeProjectId));
    };
    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key &&
        !event.key.includes('image_studio_analysis_plan_snapshot_') &&
        event.key !== 'image_studio_analysis_plan_snapshot_session'
      ) {
        return;
      }
      syncPersistedSnapshot();
    };

    syncPersistedSnapshot();
    window.addEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, syncPersistedSnapshot);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, syncPersistedSnapshot);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId]);

  const paddingXPercent = useMemo(() => normalizePaddingPercent(layoutPaddingX), [layoutPaddingX]);
  const paddingYPercent = useMemo(() => normalizePaddingPercent(layoutPaddingY), [layoutPaddingY]);
  const whiteThreshold = useMemo(
    () =>
      normalizeThreshold(
        layoutWhiteThreshold,
        WHITE_THRESHOLD_MIN,
        WHITE_THRESHOLD_MAX,
        WHITE_THRESHOLD_DEFAULT
      ),
    [layoutWhiteThreshold]
  );
  const chromaThreshold = useMemo(
    () =>
      normalizeThreshold(
        layoutChromaThreshold,
        CHROMA_THRESHOLD_MIN,
        CHROMA_THRESHOLD_MAX,
        CHROMA_THRESHOLD_DEFAULT
      ),
    [layoutChromaThreshold]
  );
  const layoutPresetOptions = useMemo(
    () => buildObjectLayoutPresetOptions(layoutCustomPresets),
    [layoutCustomPresets]
  );
  const layoutPresetOptionValue = useMemo(
    () =>
      resolveObjectLayoutPresetOptionValue(
        {
          detection: layoutDetection,
          shadowPolicy: layoutShadowPolicy,
          whiteThreshold,
          chromaThreshold,
        },
        layoutCustomPresets
      ),
    [chromaThreshold, layoutCustomPresets, layoutDetection, layoutShadowPolicy, whiteThreshold]
  );
  const selectedCustomPresetId = useMemo(
    () => resolveCustomPresetIdFromOptionValue(layoutPresetOptionValue),
    [layoutPresetOptionValue]
  );
  const selectedCustomPreset = useMemo(
    () => layoutCustomPresets.find((preset) => preset.id === selectedCustomPresetId) ?? null,
    [layoutCustomPresets, selectedCustomPresetId]
  );
  const layoutCanDeletePreset = Boolean(selectedCustomPresetId);
  const layoutCanSavePreset = layoutPresetDraftName.trim().length > 0;
  const layoutSavePresetLabel = selectedCustomPresetId ? 'Update Preset' : 'Save Preset';
  const resolvedAnalysisSourceSlotId =
    resultSourceSlotId.trim() || persistedPlanSnapshot?.slotId?.trim() || '';
  const resolvedAnalysisSourceSignature =
    resultSourceSignature.trim() || persistedPlanSnapshot?.sourceSignature?.trim() || '';
  const analysisSourceSignatureMissing =
    resolvedAnalysisSourceSlotId !== '' && resolvedAnalysisSourceSignature === '';
  const analysisPlanIsStale = useMemo((): boolean => {
    if (!resolvedAnalysisSourceSlotId || !resolvedAnalysisSourceSignature) return false;
    const sourceSlot = slots.find(
      (slot) => (slot.id ?? '').trim() === resolvedAnalysisSourceSlotId
    );
    if (!sourceSlot) return false;
    const currentSignature = buildSlotSourceSignature(sourceSlot);
    if (!currentSignature) return false;
    return currentSignature !== resolvedAnalysisSourceSignature;
  }, [
    buildSlotSourceSignature,
    resolvedAnalysisSourceSignature,
    resolvedAnalysisSourceSlotId,
    slots,
  ]);
  const analysisCurrentSourceMetadataMissing = useMemo((): boolean => {
    if (!resolvedAnalysisSourceSlotId) return false;
    const sourceSlot = slots.find(
      (slot) => (slot.id ?? '').trim() === resolvedAnalysisSourceSlotId
    );
    if (!sourceSlot) return false;
    return buildSlotSourceSignature(sourceSlot) === '';
  }, [buildSlotSourceSignature, resolvedAnalysisSourceSlotId, slots]);

  useEffect(() => {
    const nextSelectedId = selectedCustomPreset?.id ?? null;
    if (selectedCustomPresetIdRef.current === nextSelectedId) return;
    selectedCustomPresetIdRef.current = nextSelectedId;
    if (selectedCustomPreset?.name) {
      setLayoutPresetDraftName(selectedCustomPreset.name);
    }
  }, [selectedCustomPreset?.id, selectedCustomPreset?.name]);

  useEffect(() => {
    if (skipAdvancedDefaultsSaveRef.current) {
      skipAdvancedDefaultsSaveRef.current = false;
      return;
    }
    saveObjectLayoutAdvancedDefaults(activeProjectId, {
      detection: layoutDetection,
      shadowPolicy: layoutShadowPolicy,
      whiteThreshold,
      chromaThreshold,
    });
  }, [activeProjectId, chromaThreshold, layoutDetection, layoutShadowPolicy, whiteThreshold]);

  const resolvedFillMissingCanvasWhite = layoutFillMissingCanvasWhite && Boolean(projectCanvasSize);
  const layoutPayload = {
    paddingPercent: layoutSplitAxes
      ? Number(((paddingXPercent + paddingYPercent) / 2).toFixed(2))
      : normalizePaddingPercent(layoutPadding),
    ...(layoutSplitAxes
      ? {
        paddingXPercent,
        paddingYPercent,
      }
      : {}),
    fillMissingCanvasWhite: resolvedFillMissingCanvasWhite,
    ...(resolvedFillMissingCanvasWhite && projectCanvasSize
      ? {
        targetCanvasWidth: projectCanvasSize.width,
        targetCanvasHeight: projectCanvasSize.height,
      }
      : {}),
    whiteThreshold,
    chromaThreshold,
    shadowPolicy: layoutShadowPolicy,
    detection: layoutDetection,
  };

  const busyLabel = useMemo(() => {
    if (!busy) return 'Analyze Image';
    switch (status) {
      case 'resolving':
        return 'Analyze: Resolving';
      case 'processing':
        return 'Analyze: Processing';
      default:
        return 'Analyze Image';
    }
  }, [busy, status]);

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

  const queueAnalysisApplyIntent = (
    target: 'object_layout' | 'auto_scaler',
    options?: { runAfterApply?: boolean }
  ): void => {
    const fallbackSlotId = persistedPlanSnapshot?.slotId?.trim() ?? '';
    const fallbackSourceSignature = persistedPlanSnapshot?.sourceSignature?.trim() ?? '';
    const fallbackLayout = persistedPlanSnapshot?.layout ?? null;
    const resolvedLayout = result ? toSharedLayout(result.layout) : fallbackLayout;
    if (!resolvedLayout) {
      toast('Run analysis before applying plan to tools.', { variant: 'info' });
      return;
    }
    const analyzedSlotId = resultSourceSlotId.trim() || fallbackSlotId;
    if (!analyzedSlotId) {
      toast('Analysis slot context is missing. Rerun analysis first.', { variant: 'info' });
      return;
    }
    const analyzedSourceSignature = resultSourceSignature.trim() || fallbackSourceSignature;
    if (!analyzedSourceSignature) {
      toast('Analysis source signature is missing. Rerun analysis first.', { variant: 'info' });
      return;
    }
    const analyzedSlotExists = slots.some((slot) => (slot.id ?? '').trim() === analyzedSlotId);
    if (!analyzedSlotExists) {
      toast('Analyzed slot no longer exists. Run analysis again on an available slot.', {
        variant: 'info',
      });
      return;
    }
    if (slotSelectionLocked) {
      toast('Cannot apply while slot selection is locked.', { variant: 'info' });
      return;
    }
    const analyzedSlot = slots.find((slot) => (slot.id ?? '').trim() === analyzedSlotId);
    const currentAnalyzedSlotSignature = buildSlotSourceSignature(analyzedSlot ?? null);
    if (!currentAnalyzedSlotSignature) {
      toast('Analyzed slot source metadata is missing. Reselect slot image and rerun analysis.', {
        variant: 'info',
      });
      return;
    }
    if (analyzedSourceSignature !== currentAnalyzedSlotSignature) {
      toast('Analysis plan is stale for this slot image. Run analysis again.', {
        variant: 'info',
      });
      return;
    }
    const runAfterApply = Boolean(options?.runAfterApply);
    saveImageStudioAnalysisApplyIntent(activeProjectId, {
      slotId: analyzedSlotId,
      sourceSignature: analyzedSourceSignature,
      runAfterApply,
      target,
      layout: resolvedLayout,
    });
    const targetLabel = target === 'object_layout' ? 'Object Layout' : 'Auto Scaler';
    toast(
      runAfterApply
        ? `Queued analysis plan and execution for ${targetLabel}.`
        : `Queued analysis plan for ${targetLabel}.`,
      { variant: 'success' }
    );
    setSelectedSlotId(analyzedSlotId);
    setWorkingSlotId(analyzedSlotId);
    switchToControls();
  };

  const handleAnalyze = async (): Promise<void> => {
    const slotId = workingSlot?.id?.trim() ?? '';
    if (!slotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before analysis.', { variant: 'info' });
      return;
    }
    if (busy) return;
    const sourceSignature = buildImageStudioAnalysisSourceSignature({
      slotId,
      imageFileId: workingSlot?.imageFileId ?? null,
      imageFile: workingSlot?.imageFile ?? null,
      imageUrl: workingSlot?.imageUrl ?? null,
      imageBase64: workingSlot?.imageBase64 ?? null,
      resolvedImageSrc: workingSlotImageSrc,
      clientProcessingImageSrc,
    });
    if (!sourceSignature) {
      toast('Unable to capture source signature for analysis. Reselect slot image and retry.', {
        variant: 'info',
      });
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setBusy(true);
    setStatus('resolving');
    try {
      let nextResult: AnalysisResult;
      if (mode === 'client_analysis') {
        const source = clientProcessingImageSrc || workingSlotImageSrc;
        if (!source) {
          throw new Error('No client image source is available for analysis.');
        }
        setStatus('processing');
        const analysis = await analyzeCanvasImageObject(source, layoutPayload);
        nextResult = {
          ...analysis,
          effectiveMode: 'client_analysis',
          authoritativeSource: 'client_upload',
        };
      } else {
        setStatus('processing');
        const response = await api
          .post<unknown>(
            `/api/image-studio/slots/${encodeURIComponent(slotId)}/analysis`,
            {
              mode,
              layout: layoutPayload,
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
      setResult(nextResult);
      setResultSourceSlotId(slotId);
      setResultSourceSignature(sourceSignature);
      saveImageStudioAnalysisPlanSnapshot(activeProjectId, {
        slotId,
        sourceSignature,
        savedAt: new Date().toISOString(),
        layout: toSharedLayout(nextResult.layout),
        effectiveMode: nextResult.effectiveMode,
        authoritativeSource: nextResult.authoritativeSource,
        detectionUsed: nextResult.detectionUsed,
        confidence: nextResult.confidence,
        policyVersion: nextResult.policyVersion,
        policyReason: nextResult.policyReason,
        fallbackApplied: nextResult.fallbackApplied,
      });
    } catch (error) {
      logClientError(error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast('Image analysis canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to analyze image.', {
        variant: 'error',
      });
    } finally {
      abortControllerRef.current = null;
      setBusy(false);
      setStatus('idle');
    }
  };

  const handleCancel = (): void => {
    const controller = abortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const availableSlots = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        label: slot.name ?? undefined,
      })),
    [slots]
  );

  const analysisSettingsConfig: AnalysisSettingsSectionConfig = {
    mode,
    setMode,
    layoutPadding,
    setLayoutPadding,
    layoutPaddingX,
    setLayoutPaddingX,
    layoutPaddingY,
    setLayoutPaddingY,
    layoutSplitAxes,
    setLayoutSplitAxes,
    layoutAdvancedEnabled,
    setLayoutAdvancedEnabled,
    layoutDetection,
    setLayoutDetection,
    layoutWhiteThreshold,
    setLayoutWhiteThreshold,
    layoutChromaThreshold,
    setLayoutChromaThreshold,
    layoutFillMissingCanvasWhite,
    setLayoutFillMissingCanvasWhite,
    layoutShadowPolicy,
    setLayoutShadowPolicy,
    layoutPresetOptionValue,
    layoutPresetOptions,
    layoutPresetDraftName,
    setLayoutPresetDraftName,
    onCenterLayoutPresetChange: (value: string) => {
      const presetValues = getObjectLayoutPresetValuesFromOption(
        value as ObjectLayoutPresetOptionValue,
        layoutCustomPresets
      );
      if (!presetValues) return;
      setLayoutDetection(presetValues.detection);
      setLayoutShadowPolicy(presetValues.shadowPolicy);
      setLayoutWhiteThreshold(String(presetValues.whiteThreshold));
      setLayoutChromaThreshold(String(presetValues.chromaThreshold));
    },
    onCenterLayoutSavePreset: () => {
      try {
        const saved = saveObjectLayoutCustomPreset(activeProjectId, {
          presetId: selectedCustomPresetId,
          name: layoutPresetDraftName,
          values: {
            detection: layoutDetection,
            shadowPolicy: layoutShadowPolicy,
            whiteThreshold,
            chromaThreshold,
          },
        });
        setLayoutCustomPresets(saved.presets);
        setLayoutPresetDraftName(saved.savedPreset.name);
        toast(`Saved preset "${saved.savedPreset.name}".`, { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to save custom preset.', {
          variant: 'error',
        });
      }
    },
    onCenterLayoutDeletePreset: () => {
      if (!selectedCustomPresetId) return;
      const deletedName = selectedCustomPreset?.name?.trim() ?? '';
      const nextPresets = deleteObjectLayoutCustomPreset(activeProjectId, selectedCustomPresetId);
      setLayoutCustomPresets(nextPresets);
      setLayoutPresetDraftName('');
      toast(deletedName ? `Deleted preset "${deletedName}".` : 'Deleted selected custom preset.', {
        variant: 'success',
      });
    },
    layoutCanSavePreset,
    layoutCanDeletePreset,
    layoutSavePresetLabel,
    projectCanvasSize,
    busy,
    busyLabel,
    handleAnalyze: () => {
      void handleAnalyze();
    },
    handleCancel,
    workingSlotId: workingSlot?.id ?? null,
    workingSlotImageSrc,
    sanitizePaddingInput,
    sanitizeThresholdInput,
  };

  const customTriggerButtonsRuntime = useMemo(
    () => ({
      projectId: activeProjectId,
      pathMetas: aiPathsAnalysis.pathMetas,
      triggerAnalysisForPath: aiPathsAnalysis.triggerAnalysisForPath,
      isRunning:
        aiPathsAnalysis.status !== 'idle' &&
        aiPathsAnalysis.status !== 'completed' &&
        aiPathsAnalysis.status !== 'error',
    }),
    [
      activeProjectId,
      aiPathsAnalysis.pathMetas,
      aiPathsAnalysis.status,
      aiPathsAnalysis.triggerAnalysisForPath,
    ]
  );

  const analysisResultRuntime = useMemo(
    () => ({
      result,
      resultSourceSlotId,
      persistedPlanSnapshot,
      currentWorkingSlotId: workingSlot?.id?.trim() ?? '',
      availableSlots,
      slotSelectionLocked,
      analysisSourceSignatureMissing,
      analysisCurrentSourceMetadataMissing,
      analysisPlanIsStale,
      queueAnalysisApplyIntent,
    }),
    [
      result,
      resultSourceSlotId,
      persistedPlanSnapshot,
      workingSlot?.id,
      availableSlots,
      slotSelectionLocked,
      analysisSourceSignatureMissing,
      analysisCurrentSourceMetadataMissing,
      analysisPlanIsStale,
      queueAnalysisApplyIntent,
    ]
  );

  const analysisRuntimeValue = useMemo(
    () => ({
      settingsConfig: analysisSettingsConfig,
      resultRuntime: analysisResultRuntime,
      customTriggerButtonsRuntime,
    }),
    [analysisSettingsConfig, analysisResultRuntime, customTriggerButtonsRuntime]
  );

  return (
    <div className='page-section-slim max-w-6xl'>
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40 space-y-4'>
        <div>
          <div className='text-lg text-gray-100'>Image Analysis</div>
          <div className='text-xs text-gray-500'>
            Detect object bounds from whitespace/foreground and preview auto-scaler plan using
            shared analysis logic.
          </div>
        </div>

        <ImageStudioAnalysisRuntimeProvider value={analysisRuntimeValue}>
          <CustomTriggerButtonsSection />

          <AiPathAnalysisTriggerProvider value={aiPathsAnalysis}>
            <AiPathAnalysisTriggerSection variant='full' />
          </AiPathAnalysisTriggerProvider>

          <AnalysisSettingsSection />

          <AnalysisResultSection />
        </ImageStudioAnalysisRuntimeProvider>
      </Card>
    </div>
  );
}
