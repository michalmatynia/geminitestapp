/* eslint-disable */
// @ts-nocheck
'use client';

import { Clock3, GitBranch, Redo2, Sparkles, Undo2, Workflow } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  Button,
  DetailModal,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ImageStudioAnalysisTab } from './ImageStudioAnalysisTab';
import {
  ACTION_HISTORY_MAX_STEPS,
} from './right-sidebar/right-sidebar-utils';
import { RightSidebarControlsTab } from './right-sidebar/RightSidebarControlsTab';
import { RightSidebarHistoryTab } from './right-sidebar/RightSidebarHistoryTab';
import { RightSidebarQuickActions } from './right-sidebar/RightSidebarQuickActions';
import { RightSidebarRequestPreviewBody } from './right-sidebar/RightSidebarRequestPreviewBody';
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
import { supportsImageSequenceGeneration } from '../utils/image-models';
import { buildRunRequestPreview } from '../utils/run-request-preview';
import { normalizeImageStudioModelPresets, resolveImageStudioSequenceActiveSteps } from '../utils/studio-settings';
import { 
  formatCanvasSizeLabel, 
  CANVAS_SIZE_PRESET_OPTIONS, 
  estimatePromptTokens, 
  resolveModelCostProfile, 
  cloneSerializableValue 
} from './right-sidebar/right-sidebar-utils';
import { CanvasResizeModal } from './right-sidebar/CanvasResizeModal';
import { ControlPromptModal } from './right-sidebar/ControlPromptModal';
import { ParamRow } from './ParamRow';
import { flattenParams } from '@/features/prompt-engine/prompt-params';

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
  const {
    setCompositeAssetIds,
    setSelectedFolder,
    setWorkingSlotId,
    setPreviewMode,
  } = useSlotsActions();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const {
    setPromptText,
    setParamsState,
    setParamSpecs,
    setParamUiOverrides,
  } = usePromptActions();
  const { studioSettings } = useSettingsState();
  const { runMutation, isRunInFlight, activeRunStatus } = useGenerationState();
  const { handleRunGeneration } = useGenerationActions();
  const { setStudioSettings } = useSettingsActions();

  const [requestPreviewOpen, setRequestPreviewOpen] = useState(false);
  const [requestPreviewMode, setRequestPreviewMode] = useState<RequestPreviewMode>('without_sequence');
  const [promptControlOpen, setPromptControlOpen] = useState(false);
  const [sequenceRunBusy, setSequenceRunBusy] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resizeCanvasOpen, setResizeCanvasOpen] = useState(false);
  const [canvasSizePresetValue, setCanvasSizePresetValue] = useState('1024x1024');
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'analysis' | 'graph' | 'sequencing' | 'history'>('controls');
  const [historyMode, setHistoryMode] = useState<'actions' | 'runs'>('actions');
  const [quickActionsHostEl, setQuickActionsHostEl] = useState<HTMLElement | null>(null);
  
  const { toast } = useUiActions();

  const switchToControls = React.useCallback(() => setSidebarTab('controls'), []);

  const flattenedParamsList = useMemo(
    () => (paramsState ? (flattenParams(paramsState) as any[]).filter((leaf) => Boolean(leaf.path)) : []),
    [paramsState]
  );
  const hasExtractedControls = flattenedParamsList.length > 0;

  const quickSwitchModels = useMemo(
    () =>
      normalizeImageStudioModelPresets(
        studioSettings.targetAi.openai.modelPresets,
        studioSettings.targetAi.openai.model,
      ),
    [studioSettings.targetAi.openai.modelPresets, studioSettings.targetAi.openai.model]
  );
  const quickModelOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );
  const estimatedPromptTokens = useMemo(
    () => estimatePromptTokens(promptText),
    [promptText]
  );
  const selectedModelId = useMemo(
    () => studioSettings.targetAi.openai.model.trim() || 'unknown-model',
    [studioSettings.targetAi.openai.model]
  );
  const quickModelValue = selectedModelId;
  const estimatedGenerationCost = useMemo(() => {
    const profile = resolveModelCostProfile(studioSettings.targetAi.openai.model);
    const count = Math.max(1, Number(studioSettings.targetAi.openai.image.n ?? 1));
    const imageCost = profile.imageUsdPerImage * count;
    const promptCost = (estimatedPromptTokens / 1000) * profile.inputUsdPer1KTokens;
    return imageCost + promptCost;
  }, [estimatedPromptTokens, studioSettings.targetAi.openai.image.n, studioSettings.targetAi.openai.model]);
  const modelSupportsSequenceGeneration = useMemo(
    () => supportsImageSequenceGeneration(studioSettings.targetAi.openai.model),
    [studioSettings.targetAi.openai.model]
  );
  const enabledSequenceRuntimeSteps = useMemo(
    () => resolveImageStudioSequenceActiveSteps(studioSettings.projectSequencing).filter((step) => step.enabled),
    [studioSettings.projectSequencing]
  );
  const sequenceRequiresPrompt = useMemo(
    () => enabledSequenceRuntimeSteps.some((step) => step.type === 'generate' || step.type === 'regenerate'),
    [enabledSequenceRuntimeSteps]
  );
  const activeProject = useMemo(
    () =>
      (projectsQuery.data ?? []).find((project) => project.id === projectId) ??
      null,
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

  const sequenceImageContentFrame = useMemo((): { x: number; y: number; width: number; height: number } | null => {
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
  const canResetCanvasImageOffset = Math.abs(canvasImageOffset.x) > 0.5 || Math.abs(canvasImageOffset.y) > 0.5;
  const isMoveImageActive = imageTransformMode === 'move';
  const canRecenterCanvasImage = isMoveImageActive && canResetCanvasImageOffset;

  const actionHistorySnapshotInput = useMemo(() => ({
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
    studioSettings: studioSettings as unknown as Record<string, unknown>,
    tool,
    validatorEnabled,
    workingSlotId,
  }), [
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
  ]);

  const applyActionHistorySnapshot = React.useCallback((snapshot: any): void => {
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
    setParamSpecs(cloneSerializableValue(snapshot.paramSpecs) as any);
    setParamUiOverrides(cloneSerializableValue(snapshot.paramUiOverrides) as any);
    setStudioSettings(cloneSerializableValue(snapshot.studioSettings) as any);
    setValidatorEnabled(snapshot.validatorEnabled);
    setFormatterEnabled(snapshot.validatorEnabled ? snapshot.formatterEnabled : false);
  }, [setSelectedFolder, setWorkingSlotId, setPreviewMode, setCompositeAssetIds, setTool, setCanvasSelectionEnabled, setImageTransformMode, setCanvasImageOffset, setCanvasBackgroundLayerEnabled, setCanvasBackgroundColor, setMaskShapes, setActiveMaskId, setSelectedPointIndex, setMaskInvert, setMaskFeather, setBrushRadius, setPromptText, setParamsState, setParamSpecs, setParamUiOverrides, setStudioSettings, setValidatorEnabled, setFormatterEnabled]);

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

  const {
    handleRunSequenceGeneration,
    sequenceRequestPreview,
    sequenceRequestPreviewJson,
  } = useRightSidebarSequence({
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
    studioSettings: studioSettings as any,
    toast: (msg: string, opt?: any) => { (toast as any)(msg, opt); },
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

  const activeRequestPreview = requestPreviewMode === 'with_sequence'
    ? sequenceRequestPreview
    : requestPreview;
  const activeRequestPreviewJson = requestPreviewMode === 'with_sequence'
    ? sequenceRequestPreviewJson
    : generationRequestPreviewJson;
  const activeRequestPreviewEndpoint = requestPreviewMode === 'with_sequence'
    ? '/api/image-studio/sequences/run'
    : '/api/image-studio/run';

  useEffect(() => {
    setHistoryMode('actions');
  }, [projectId]);

  useEffect(() => {
    setCanvasSizePresetValue(currentCanvasSizeValue);
  }, [currentCanvasSizeValue, projectId]);

  useEffect((): (() => void) | void => {
    if (typeof document === 'undefined') return;
    const resolveHost = (): void => {
      const nextHost = document.getElementById(IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID);
      setQuickActionsHostEl((currentHost) => (currentHost === nextHost ? currentHost : nextHost));
    };
    resolveHost();
    const frameId = window.requestAnimationFrame(resolveHost);
    return (): void => { window.cancelAnimationFrame(frameId); };
  }, [projectId, sidebarTab]);

  const handleQuickModelChange = React.useCallback((value: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      targetAi: {
        ...prev.targetAi,
        openai: { ...prev.targetAi.openai, api: 'images', model: value },
      },
    }));
  }, [setStudioSettings]);

  const quickActionsPanelContent = useMemo(() => (
    <RightSidebarQuickActions />
  ), []);

  const contextValue = useMemo(
    (): RightSidebarContextValue => ({
      switchToControls,
      canvasSizePresetOptions,
      canvasSizePresetValue,
      setCanvasSizePresetValue,
      canvasSizeLabel: projectCanvasSizeLabel,
      canApplyCanvasSizePreset: true,
      canRecenterCanvasImage,
      onApplyCanvasSizePreset: () => {},
      onOpenResizeCanvasModal: () => setResizeCanvasOpen(true),
      quickActionsHostEl,
      quickActionsPanelContent,
      resizeCanvasDisabled: !projectId.trim(),

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
      activeImages: (activeRequestPreview as any).images || [],
      activeRequestPreviewEndpoint,
      activeRequestPreviewJson,
      maskShapeCount: activeRequestPreview.maskShapeCount,
      requestPreviewMode,
      sequenceStepCount: (sequenceRequestPreview as any).stepCount || 0,
      setRequestPreviewMode,

      // Quick Actions
      estimatedGenerationCost,
      estimatedPromptTokens,
      generationBusy,
      generationLabel,
      hasExtractedControls,
      modelSupportsSequenceGeneration,
      modelValue: quickModelValue,
      onModelChange: handleQuickModelChange,
      onOpenControls: () => setControlsOpen(true),
      onOpenPromptControl: () => setPromptControlOpen(true),
      onOpenRequestPreview: () => setRequestPreviewOpen(true),
      onRunGeneration: handleRunGeneration,
      onRunSequenceGeneration: handleRunSequenceGeneration,
      quickModelOptions,
      selectedModelId,
      sequenceRunBusy,
    }),
    [switchToControls, canvasSizePresetOptions, canvasSizePresetValue, projectCanvasSizeLabel, canRecenterCanvasImage, quickActionsHostEl, quickActionsPanelContent, projectId, actionHistoryEntries.length, actionHistoryItems, activeActionHistoryIndex, historyMode, handleRestoreActionStep, activeRequestPreview, activeRequestPreviewEndpoint, activeRequestPreviewJson, requestPreviewMode, sequenceRequestPreview, setRequestPreviewMode, estimatedGenerationCost, estimatedPromptTokens, generationBusy, generationLabel, hasExtractedControls, modelSupportsSequenceGeneration, quickModelValue, handleQuickModelChange, handleRunGeneration, handleRunSequenceGeneration, quickModelOptions, selectedModelId, sequenceRunBusy]
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
              onClick={() => setSidebarTab(tab as any)}
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
            Action History {activeActionHistoryIndex >= 0 ? `${activeActionHistoryIndex + 1}/${actionHistoryEntries.length}` : '0/0'}
          </div>
          <div className='flex items-center gap-1.5'>
            <Button size='xs' variant='outline' className='h-6 px-2 text-[10px]' onClick={handleUndoAction} disabled={!canUndoAction}>
              <Undo2 className='mr-1 size-3' /> Undo
            </Button>
            <Button size='xs' variant='outline' className='h-6 px-2 text-[10px]' onClick={handleRedoAction} disabled={!canRedoAction}>
              <Redo2 className='mr-1 size-3' /> Redo
            </Button>
          </div>
        </div>

        {quickActionsHostEl && createPortal(<div className='space-y-2 pb-2'>{quickActionsPanelContent}</div>, quickActionsHostEl)}

        {sidebarTab === 'analysis' ? (
          <div className='min-h-0 flex flex-1 overflow-y-auto'><ImageStudioAnalysisTab /></div>
        ) : sidebarTab === 'graph' ? (
          selectedSlotId ? <VersionNodeMapPanel /> : <div className='min-h-0 flex flex-1 items-center justify-center px-4 text-center text-xs text-gray-500'>Select a card to view its version graph.</div>
        ) : sidebarTab === 'sequencing' ? (
          <SequencingPanel />
        ) : sidebarTab === 'history' ? (
          <RightSidebarHistoryTab />
        ) : (
          <RightSidebarControlsTab />
        )}
      </div>

      <ControlPromptModal isOpen={promptControlOpen} onClose={() => setPromptControlOpen(false)} />

      <DetailModal isOpen={controlsOpen} onClose={() => setControlsOpen(false)} title='Controls' size='lg'>
        <div className='space-y-4 text-sm text-gray-200'>
          {hasExtractedControls ? (
            <div className='max-h-[70vh] space-y-3 overflow-auto pr-1'>
              {flattenedParamsList.map((leaf) => <ParamRow key={leaf.path} leaf={leaf} />)}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>No extracted controls available yet.</div>
          )}
        </div>
      </DetailModal>

      <CanvasResizeModal isOpen={resizeCanvasOpen} onClose={() => setResizeCanvasOpen(false)} />

      <DetailModal isOpen={requestPreviewOpen} onClose={() => setRequestPreviewOpen(false)} title='Generation Request Preview' size='xl'>
        <RightSidebarRequestPreviewBody />
      </DetailModal>
    </RightSidebarProvider>
  );
}
