'use client';

import { Clock3, GitBranch, Redo2, Sparkles, Undo2, Workflow } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { supportsImageSequenceGeneration } from '@/features/ai/image-studio/utils/image-models';
import { type ParamUiControl } from '@/features/ai/image-studio/utils/param-ui';
import { buildRunRequestPreview } from '@/features/ai/image-studio/utils/run-request-preview';
import { resolveImageStudioSequenceActiveSteps } from '@/features/ai/image-studio/utils/studio-settings';
import { type ImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import type { ParamSpec } from '@/shared/contracts/prompt-engine';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { flattenParams } from '@/shared/lib/prompt-engine';
import { Button, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ImageStudioAnalysisTab } from './ImageStudioAnalysisTab';
import { CanvasResizeModal } from './right-sidebar/CanvasResizeModalImpl';
import { ControlPromptModal } from './right-sidebar/ControlPromptModalImpl';
import { ACTION_HISTORY_MAX_STEPS } from './right-sidebar/right-sidebar-utils';
import {
  formatCanvasSizeLabel,
  CANVAS_SIZE_PRESET_OPTIONS,
  estimatePromptTokens,
  resolveModelCostProfile,
  cloneSerializableValue,
  parseCanvasSizePresetValue,
  type StudioActionHistorySnapshot,
} from './right-sidebar/right-sidebar-utils';
import { RightSidebarControlsModal } from './right-sidebar/RightSidebarControlsModal';
import { RightSidebarControlsTab } from './right-sidebar/RightSidebarControlsTab';
import { RightSidebarHistoryTab } from './right-sidebar/RightSidebarHistoryTab';
import { RightSidebarQuickActions } from './right-sidebar/RightSidebarQuickActions';
import { RightSidebarRequestPreviewModal } from './right-sidebar/RightSidebarRequestPreviewModal';
import { useRightSidebarCanvasResize } from './right-sidebar/useRightSidebarCanvasResize';
import { useRightSidebarActionHistory } from './right-sidebar/useRightSidebarActionHistory';
import { useRightSidebarSequence } from './right-sidebar/useRightSidebarSequence';
import { RightSidebarProvider, type RightSidebarContextValue } from './RightSidebarContext';
import { SequencingPanel } from './SequencingPanel';
import { VersionNodeMapPanel } from './VersionNodeMapPanel';
import { useGenerationState, useGenerationActions } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';



const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

type RequestPreviewMode = 'without_sequence' | 'with_sequence';

export function RightSidebar(): React.JSX.Element {
  const {
    isFocusMode,
    validatorEnabled,
    formatterEnabled,
    canvasSelectionEnabled,
    imageTransformMode,
    canvasImageOffset,
    canvasBackgroundLayerEnabled,
    canvasBackgroundColor,
  } = useUiState();
  const {
    setValidatorEnabled,
    setFormatterEnabled,
    setCanvasSelectionEnabled,
    setImageTransformMode,
    setCanvasImageOffset,
    setCanvasBackgroundLayerEnabled,
    setCanvasBackgroundColor,
    getPreviewCanvasImageFrame,
  } = useUiActions();
  const { projectId, projectsQuery } = useProjectsState();
  const {
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
  } = useMaskingState();
  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
    setMaskInvert,
    setMaskFeather,
    setBrushRadius,
  } = useMaskingActions();
  const {
    workingSlot,
    slots,
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    previewMode,
    compositeAssetIds,
  } = useSlotsState();
  const { setCompositeAssetIds, setSelectedFolder, setWorkingSlotId, setPreviewMode } =
    useSlotsActions();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const { setPromptText, setParamsState, setParamSpecs, setParamUiOverrides } = usePromptActions();
  const { studioSettings } = useSettingsState();
  const { runMutation, isRunInFlight, activeRunStatus } = useGenerationState();
  const { handleRunGeneration } = useGenerationActions();
  const { setStudioSettings } = useSettingsActions();
  const brainGenerationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });

  const [requestPreviewOpen, setRequestPreviewOpen] = useState(false);
  const [requestPreviewMode, setRequestPreviewMode] =
    useState<RequestPreviewMode>('without_sequence');
  const [promptControlOpen, setPromptControlOpen] = useState(false);
  const [sequenceRunBusy, setSequenceRunBusy] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resizeCanvasOpen, setResizeCanvasOpen] = useState(false);
  const [canvasSizePresetValue, setCanvasSizePresetValue] = useState('1024x1024');
  const [sidebarTab, setSidebarTab] = useState<
    'controls' | 'analysis' | 'graph' | 'sequencing' | 'history'
  >('controls');
  const [historyMode, setHistoryMode] = useState<'actions' | 'runs'>('actions');
  const [quickActionsHostEl, setQuickActionsHostEl] = useState<HTMLElement | null>(null);

  const { toast } = useToast();

  const switchToControls = React.useCallback(() => setSidebarTab('controls'), []);
  const {
    applyCanvasSizePreset,
    canResizeCanvas,
    resizeCanvasBusy,
  } = useRightSidebarCanvasResize();

  const flattenedParamsList = useMemo(
    () =>
      paramsState
        ? (
            flattenParams(paramsState) as Array<{ path: string; value: unknown; kind: string }>
        ).filter((leaf) => Boolean(leaf.path))
        : [],
    [paramsState]
  );
  const hasExtractedControls = flattenedParamsList.length > 0;

  const estimatedPromptTokens = useMemo(() => estimatePromptTokens(promptText), [promptText]);
  const selectedModelId = useMemo(
    () => brainGenerationModel.effectiveModelId.trim(),
    [brainGenerationModel.effectiveModelId]
  );
  const estimatedGenerationCost = useMemo(() => {
    const profile = resolveModelCostProfile(selectedModelId);
    const count = Math.max(1, Number(studioSettings.targetAi.openai.image.n ?? 1));
    const imageCost = profile.imageUsdPerImage * count;
    const promptCost = (estimatedPromptTokens / 1000) * profile.inputUsdPer1KTokens;
    return imageCost + promptCost;
  }, [estimatedPromptTokens, selectedModelId, studioSettings.targetAi.openai.image.n]);
  const modelSupportsSequenceGeneration = useMemo(
    () => supportsImageSequenceGeneration(selectedModelId),
    [selectedModelId]
  );
  const enabledSequenceRuntimeSteps = useMemo(
    () =>
      resolveImageStudioSequenceActiveSteps(studioSettings.projectSequencing).filter(
        (step) => step.enabled
      ),
    [studioSettings.projectSequencing]
  );
  const sequenceRequiresPrompt = useMemo(
    () =>
      enabledSequenceRuntimeSteps.some(
        (step) => step.type === 'generate' || step.type === 'regenerate'
      ),
    [enabledSequenceRuntimeSteps]
  );
  const activeProject = useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === projectId) ?? null,
    [projectId, projectsQuery.data]
  );
  const workingSlotImageWidth = useMemo((): number | null => {
    const width = workingSlot?.imageFile?.width ?? null;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  }, [workingSlot?.imageFile?.width]);
  const workingSlotImageHeight = useMemo((): number | null => {
    const height = workingSlot?.imageFile?.height ?? null;
    return typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;
  }, [workingSlot?.imageFile?.height]);

  const projectCanvasWidthPx = activeProject?.canvasWidthPx ?? null;
  const projectCanvasHeightPx = activeProject?.canvasHeightPx ?? null;

  const projectCanvasSizeLabel = useMemo(
    () => formatCanvasSizeLabel(projectCanvasWidthPx, projectCanvasHeightPx),
    [projectCanvasHeightPx, projectCanvasWidthPx]
  );
  const fallbackCanvasWidthPx = useMemo(
    () => projectCanvasWidthPx ?? workingSlotImageWidth ?? 1024,
    [projectCanvasWidthPx, workingSlotImageWidth]
  );
  const fallbackCanvasHeightPx = useMemo(
    () => projectCanvasHeightPx ?? workingSlotImageHeight ?? 1024,
    [projectCanvasHeightPx, workingSlotImageHeight]
  );
  const currentCanvasSizeValue = useMemo(
    () => `${fallbackCanvasWidthPx}x${fallbackCanvasHeightPx}`,
    [fallbackCanvasHeightPx, fallbackCanvasWidthPx]
  );
  const canvasSizePresetOptions = useMemo(() => {
    const hasCurrentOption = CANVAS_SIZE_PRESET_OPTIONS.some(
      (option) => option.value === currentCanvasSizeValue
    );
    const currentLabel = `Current ${fallbackCanvasWidthPx} x ${fallbackCanvasHeightPx}`;
    if (hasCurrentOption) {
      return CANVAS_SIZE_PRESET_OPTIONS.map((option) =>
        option.value === currentCanvasSizeValue
          ? {
            ...option,
            label: `${option.label} (Current)`,
          }
          : option
      );
    }
    return [
      {
        value: currentCanvasSizeValue,
        label: currentLabel,
        description: 'Current project canvas size.',
      },
      ...CANVAS_SIZE_PRESET_OPTIONS,
    ];
  }, [currentCanvasSizeValue, fallbackCanvasHeightPx, fallbackCanvasWidthPx]);

  const sequenceImageContentFrame = useMemo((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (frameBinding?.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame;
  }, [getPreviewCanvasImageFrame, workingSlot?.id]);

  const generationBusy = runMutation.isPending || isRunInFlight;
  const generationLabel = generationBusy
    ? activeRunStatus === 'queued'
      ? 'Queued...'
      : 'Generating...'
    : `Generate From Prompt ${(studioSettings.targetAi.openai.image.n ?? 1) > 1 ? `(${studioSettings.targetAi.openai.image.n})` : ''}`;
  const canResetCanvasImageOffset =
    Math.abs(canvasImageOffset.x) > 0.5 || Math.abs(canvasImageOffset.y) > 0.5;
  const isMoveImageActive = imageTransformMode === 'move';
  const canRecenterCanvasImage = isMoveImageActive && canResetCanvasImageOffset;

  const actionHistorySnapshotInput = useMemo(
    () => ({
      activeMaskId,
      brushRadius,
      canvasImageOffset,
      canvasBackgroundLayerEnabled,
      canvasBackgroundColor,
      canvasSelectionEnabled,
      compositeAssetIds,
      formatterEnabled,
      imageTransformMode,
      maskFeather,
      maskInvert,
      maskShapes,
      paramSpecs,
      paramUiOverrides,
      paramsState,
      previewMode,
      promptText,
      selectedFolder,
      selectedPointIndex,
      selectedSlotId,
      studioSettings,
      tool,
      validatorEnabled,
      workingSlotId,
    }),
    [
      activeMaskId,
      brushRadius,
      canvasImageOffset,
      canvasBackgroundLayerEnabled,
      canvasBackgroundColor,
      canvasSelectionEnabled,
      compositeAssetIds,
      formatterEnabled,
      imageTransformMode,
      maskFeather,
      maskInvert,
      maskShapes,
      paramSpecs,
      paramUiOverrides,
      paramsState,
      previewMode,
      promptText,
      selectedFolder,
      selectedPointIndex,
      selectedSlotId,
      studioSettings,
      tool,
      validatorEnabled,
      workingSlotId,
    ]
  );

  const applyActionHistorySnapshot = React.useCallback(
    (snapshot: StudioActionHistorySnapshot): void => {
      setSelectedFolder(snapshot.selectedFolder);
      setWorkingSlotId(snapshot.workingSlotId);
      setPreviewMode(snapshot.previewMode);
      setCompositeAssetIds(cloneSerializableValue(snapshot.compositeAssetIds));
      setTool(snapshot.tool);
      setCanvasSelectionEnabled(snapshot.canvasSelectionEnabled);
      setImageTransformMode(snapshot.imageTransformMode);
      setCanvasImageOffset(cloneSerializableValue(snapshot.canvasImageOffset));
      setCanvasBackgroundLayerEnabled(snapshot.canvasBackgroundLayerEnabled);
      setCanvasBackgroundColor(snapshot.canvasBackgroundColor);
      setMaskShapes(cloneSerializableValue(snapshot.maskShapes));
      setActiveMaskId(snapshot.activeMaskId);
      setSelectedPointIndex(snapshot.selectedPointIndex);
      setMaskInvert(snapshot.maskInvert);
      setMaskFeather(snapshot.maskFeather);
      setBrushRadius(snapshot.brushRadius);
      setPromptText(snapshot.promptText);
      setParamsState(cloneSerializableValue(snapshot.paramsState));
      setParamSpecs(
        cloneSerializableValue(snapshot.paramSpecs) as Record<string, ParamSpec> | null
      );
      setParamUiOverrides(
        cloneSerializableValue(snapshot.paramUiOverrides) as Record<string, ParamUiControl>
      );
      setStudioSettings(cloneSerializableValue(snapshot.studioSettings) as ImageStudioSettings);
      setValidatorEnabled(snapshot.validatorEnabled);
      setFormatterEnabled(snapshot.validatorEnabled ? snapshot.formatterEnabled : false);
    },
    [
      setSelectedFolder,
      setWorkingSlotId,
      setPreviewMode,
      setCompositeAssetIds,
      setTool,
      setCanvasSelectionEnabled,
      setImageTransformMode,
      setCanvasImageOffset,
      setCanvasBackgroundLayerEnabled,
      setCanvasBackgroundColor,
      setMaskShapes,
      setActiveMaskId,
      setSelectedPointIndex,
      setMaskInvert,
      setMaskFeather,
      setBrushRadius,
      setPromptText,
      setParamsState,
      setParamSpecs,
      setParamUiOverrides,
      setStudioSettings,
      setValidatorEnabled,
      setFormatterEnabled,
    ]
  );

  const {
    actionHistoryEntries,
    actionHistoryItems,
    activeActionHistoryIndex,
    canRedoAction,
    canUndoAction,
    handleRedoAction,
    handleRestoreActionStep,
    handleUndoAction,
  } = useRightSidebarActionHistory({
    actionHistoryMaxSteps: ACTION_HISTORY_MAX_STEPS,
    applySnapshot: applyActionHistorySnapshot,
    projectId,
    snapshotInput: actionHistorySnapshotInput,
  });

  const { handleRunSequenceGeneration, sequenceRequestPreview, sequenceRequestPreviewJson } =
    useRightSidebarSequence({
      compositeAssetIds,
      enabledSequenceRuntimeSteps,
      maskFeather,
      maskInvert,
      maskShapes,
      modelSupportsSequenceGeneration,
      paramsState,
      projectId,
      promptText,
      sequenceRequiresPrompt,
      sequenceRunBusy,
      setPromptControlOpen,
      setSequenceRunBusy,
      setSidebarTab,
      slots,
      studioSettings,
      toast: (msg: string, opt?: { variant?: 'success' | 'error' | 'info' | 'warning' }) => {
        toast(msg, opt);
      },
      workingSlot,
      workingSlotImageWidth,
      workingSlotImageHeight,
      imageContentFrame: sequenceImageContentFrame,
    });

  const requestPreview = useMemo(
    () =>
      buildRunRequestPreview({
        projectId,
        workingSlot,
        slots,
        compositeAssetIds,
        promptText,
        paramsState,
        maskShapes,
        maskInvert,
        maskFeather,
        selectedModelId,
        studioSettings,
      }),
    [
      projectId,
      workingSlot,
      slots,
      compositeAssetIds,
      promptText,
      paramsState,
      maskShapes,
      maskInvert,
      maskFeather,
      selectedModelId,
      studioSettings,
    ]
  );

  const generationRequestPreviewJson = useMemo(
    () =>
      requestPreview.payload
        ? JSON.stringify(requestPreview.payload, null, 2)
        : JSON.stringify({ errors: requestPreview.errors }, null, 2),
    [requestPreview]
  );

  const activeRequestPreview =
    requestPreviewMode === 'with_sequence' ? sequenceRequestPreview : requestPreview;
  const activeRequestPreviewJson =
    requestPreviewMode === 'with_sequence'
      ? sequenceRequestPreviewJson
      : generationRequestPreviewJson;
  const activeRequestPreviewEndpoint =
    requestPreviewMode === 'with_sequence'
      ? '/api/image-studio/sequences/run'
      : '/api/image-studio/run';

  useEffect(() => {
    setHistoryMode('actions');
  }, [projectId]);

  useEffect(() => {
    setCanvasSizePresetValue(currentCanvasSizeValue);
  }, [currentCanvasSizeValue, projectId]);

  const canApplyCanvasSizePreset = useMemo(
    () =>
      canResizeCanvas &&
      !resizeCanvasBusy &&
      parseCanvasSizePresetValue(canvasSizePresetValue) !== null,
    [canResizeCanvas, resizeCanvasBusy, canvasSizePresetValue]
  );

  const handleApplyCanvasSizePreset = React.useCallback((): void => {
    void applyCanvasSizePreset({ presetValue: canvasSizePresetValue });
  }, [applyCanvasSizePreset, canvasSizePresetValue]);
  const openResizeCanvasModal = React.useCallback((): void => setResizeCanvasOpen(true), []);
  const closeResizeCanvasModal = React.useCallback((): void => setResizeCanvasOpen(false), []);
  const closeRequestPreview = React.useCallback((): void => setRequestPreviewOpen(false), []);
  const closeControls = React.useCallback((): void => setControlsOpen(false), []);
  const openControls = React.useCallback((): void => setControlsOpen(true), []);
  const openPromptControl = React.useCallback((): void => setPromptControlOpen(true), []);
  const closePromptControl = React.useCallback((): void => setPromptControlOpen(false), []);
  const openRequestPreview = React.useCallback((): void => setRequestPreviewOpen(true), []);

  useEffect((): (() => void) | void => {
    if (typeof document === 'undefined') return;
    const resolveHost = (): void => {
      const nextHost = document.getElementById(IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID);
      setQuickActionsHostEl((currentHost) => (currentHost === nextHost ? currentHost : nextHost));
    };
    resolveHost();
    const frameId = window.requestAnimationFrame(resolveHost);
    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [projectId, sidebarTab]);

  const quickActionsPanelContent = useMemo(() => <RightSidebarQuickActions />, []);

  const contextValue = useMemo(
    (): RightSidebarContextValue => ({
      switchToControls,
      canvasSizePresetOptions,
      canvasSizePresetValue,
      setCanvasSizePresetValue,
      canvasSizeLabel: projectCanvasSizeLabel,
      canApplyCanvasSizePreset,
      canRecenterCanvasImage,
      onApplyCanvasSizePreset: handleApplyCanvasSizePreset,
      onOpenResizeCanvasModal: openResizeCanvasModal,
      closeResizeCanvasModal,
      quickActionsHostEl,
      quickActionsPanelContent,
      resizeCanvasDisabled: !canResizeCanvas || resizeCanvasBusy,
      resizeCanvasOpen,

      // Action History
      actionHistoryEntriesLength: actionHistoryEntries.length,
      actionHistoryItems,
      actionHistoryMaxSteps: ACTION_HISTORY_MAX_STEPS,
      activeActionHistoryIndex,
      historyMode,
      setHistoryMode,
      onRestoreActionStep: handleRestoreActionStep,

      // Request Preview
      activeErrors: activeRequestPreview.errors,
      activeImages: activeRequestPreview.images || [],
      activeRequestPreviewEndpoint,
      activeRequestPreviewJson,
      closeRequestPreview,
      maskShapeCount: activeRequestPreview.maskShapeCount,
      requestPreviewOpen,
      requestPreviewMode,
      resolvedPromptLength: promptText.length,
      sequenceStepCount: sequenceRequestPreview.stepCount || 0,
      setRequestPreviewMode,

      // Quick Actions
      closeControls,
      controlsOpen,
      estimatedGenerationCost,
      estimatedPromptTokens,
      flattenedParamsList,
      generationBusy,
      generationLabel,
      hasExtractedControls,
      modelSupportsSequenceGeneration,
      onOpenControls: openControls,
      onOpenPromptControl: openPromptControl,
      closePromptControl,
      onOpenRequestPreview: openRequestPreview,
      onRunGeneration: handleRunGeneration,
      onRunSequenceGeneration: handleRunSequenceGeneration,
      promptControlOpen,
      selectedModelId,
      sequenceRunBusy,
    }),
    [
      switchToControls,
      canvasSizePresetOptions,
      canvasSizePresetValue,
      projectCanvasSizeLabel,
      canApplyCanvasSizePreset,
      canRecenterCanvasImage,
      handleApplyCanvasSizePreset,
      openResizeCanvasModal,
      closeResizeCanvasModal,
      quickActionsHostEl,
      quickActionsPanelContent,
      canResizeCanvas,
      resizeCanvasBusy,
      resizeCanvasOpen,
      actionHistoryEntries.length,
      actionHistoryItems,
      activeActionHistoryIndex,
      historyMode,
      handleRestoreActionStep,
      activeRequestPreview,
      activeRequestPreviewEndpoint,
      activeRequestPreviewJson,
      closeRequestPreview,
      requestPreviewOpen,
      requestPreviewMode,
      promptText,
      sequenceRequestPreview,
      setRequestPreviewMode,
      closeControls,
      controlsOpen,
      estimatedGenerationCost,
      estimatedPromptTokens,
      flattenedParamsList,
      generationBusy,
      generationLabel,
      hasExtractedControls,
      modelSupportsSequenceGeneration,
      openControls,
      openPromptControl,
      closePromptControl,
      openRequestPreview,
      promptControlOpen,
      handleRunGeneration,
      handleRunSequenceGeneration,
      selectedModelId,
      sequenceRunBusy,
    ]
  );

  return (
    <RightSidebarProvider value={contextValue}>
      <div
        className={cn(
          'order-3 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 transition-all duration-300 ease-in-out',
          isFocusMode && 'pointer-events-none opacity-0 translate-x-2'
        )}
        aria-hidden={isFocusMode}
      >
        <div className='grid grid-cols-5 border-b border-border/40'>
          {['controls', 'analysis', 'graph', 'sequencing', 'history'].map((tab) => (
            <Button
              key={tab}
              size='xs'
              type='button'
              variant='ghost'
              className={cn(
                'h-auto flex-1 rounded-none px-3 py-1.5 text-[11px] font-medium transition-colors',
                sidebarTab === tab
                  ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() =>
                setSidebarTab(tab as 'controls' | 'analysis' | 'graph' | 'sequencing' | 'history')
              }
            >
              {tab === 'analysis' && <Sparkles className='mr-1 inline size-3' />}
              {tab === 'graph' && <GitBranch className='mr-1 inline size-3' />}
              {tab === 'sequencing' && <Workflow className='mr-1 inline size-3' />}
              {tab === 'history' && <Clock3 className='mr-1 inline size-3' />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        <div className='flex items-center justify-between border-b border-border/30 bg-card/30 px-3 py-1.5'>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>
            Action History{' '}
            {activeActionHistoryIndex >= 0
              ? `${activeActionHistoryIndex + 1}/${actionHistoryEntries.length}`
              : '0/0'}
          </div>
          <div className='flex items-center gap-1.5'>
            <Button
              size='xs'
              variant='outline'
              className='h-6 px-2 text-[10px]'
              onClick={handleUndoAction}
              disabled={!canUndoAction}
            >
              <Undo2 className='mr-1 size-3' /> Undo
            </Button>
            <Button
              size='xs'
              variant='outline'
              className='h-6 px-2 text-[10px]'
              onClick={handleRedoAction}
              disabled={!canRedoAction}
            >
              <Redo2 className='mr-1 size-3' /> Redo
            </Button>
          </div>
        </div>

        {quickActionsHostEl &&
          createPortal(
            <div className='space-y-2 pb-2'>{quickActionsPanelContent}</div>,
            quickActionsHostEl
          )}

        {sidebarTab === 'analysis' ? (
          <div className='min-h-0 flex flex-1 overflow-y-auto'>
            <ImageStudioAnalysisTab />
          </div>
        ) : sidebarTab === 'graph' ? (
          selectedSlotId ? (
            <VersionNodeMapPanel />
          ) : (
            <div className='min-h-0 flex flex-1 items-center justify-center px-4 text-center text-xs text-gray-500'>
              Select a card to view its version graph.
            </div>
          )
        ) : sidebarTab === 'sequencing' ? (
          <SequencingPanel />
        ) : sidebarTab === 'history' ? (
          <RightSidebarHistoryTab />
        ) : (
          <RightSidebarControlsTab />
        )}
      </div>

      <ControlPromptModal />

      <RightSidebarControlsModal />

      <CanvasResizeModal />

      <RightSidebarRequestPreviewModal />
    </RightSidebarProvider>
  );
}
