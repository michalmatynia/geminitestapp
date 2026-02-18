'use client';

import { Clock3, GitBranch, Loader2, Play, Redo2, Sparkles, Undo2, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { logClientError } from '@/features/observability';
import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import { flattenParams, type ParamSpec } from '@/features/prompt-engine/prompt-params';
import { validateProgrammaticPrompt } from '@/features/prompt-engine/prompt-validator';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/features/prompt-engine/settings';
import { savePromptExploderDraftPrompt } from '@/features/prompt-exploder/bridge';
import {
  type VectorToolMode,
} from '@/features/vector-drawing';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  AppModal,
  Label,
  Textarea,
  ValidatorFormatterToggle,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ParamRow } from './ParamRow';
import {
  ACTION_HISTORY_MAX_STEPS,
  cloneSerializableValue,
  estimatePromptTokens,
  resolveModelCostProfile,
  type StudioActionHistorySnapshot,
} from './right-sidebar/right-sidebar-utils';
import { RightSidebarControlsTab } from './right-sidebar/RightSidebarControlsTab';
import { RightSidebarHistoryTab } from './right-sidebar/RightSidebarHistoryTab';
import { RightSidebarPromptControlHeader } from './right-sidebar/RightSidebarPromptControlHeader';
import { RightSidebarQuickActions } from './right-sidebar/RightSidebarQuickActions';
import { RightSidebarRequestPreviewBody } from './right-sidebar/RightSidebarRequestPreviewBody';
import { useRightSidebarActionHistory } from './right-sidebar/useRightSidebarActionHistory';
import { useRightSidebarSequence } from './right-sidebar/useRightSidebarSequence';
import { RightSidebarProvider } from './RightSidebarContext';
import { SequencingPanel } from './SequencingPanel';
import { UIPresetsPanel } from './UIPresetsPanel';
import { VersionNodeMapPanel } from './VersionNodeMapPanel';
import { useGenerationState, useGenerationActions } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { supportsImageSequenceGeneration } from '../utils/image-models';
import {
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '../utils/project-session';
import { buildRunRequestPreview } from '../utils/run-request-preview';
import { isImageStudioSlotImageLocked } from '../utils/slot-image-lock';
import { normalizeImageStudioModelPresets, resolveImageStudioSequenceActiveSteps } from '../utils/studio-settings';

import type { ParamUiControl } from '../utils/param-ui';

const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

type RequestPreviewMode = 'without_sequence' | 'with_sequence';

export function RightSidebar(): React.JSX.Element {
  const router = useRouter();
  const updateSetting = useUpdateSetting();
  const {
    isFocusMode,
    validatorEnabled,
    formatterEnabled,
    canvasSelectionEnabled,
    imageTransformMode,
    canvasImageOffset,
  } = useUiState();
  const {
    setValidatorEnabled,
    setFormatterEnabled,
    setCanvasSelectionEnabled,
    setImageTransformMode,
    setCanvasImageOffset,
    resetCanvasImageOffset,
    getPreviewCanvasImageFrame,
  } = useUiActions();
  const { projectId } = useProjectsState();
  const {
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
    maskThresholdSensitivity,
    maskEdgeSensitivity,
  } = useMaskingState();
  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
    setMaskInvert,
    setMaskFeather,
    setBrushRadius,
    setMaskThresholdSensitivity,
    setMaskEdgeSensitivity,
  } = useMaskingActions();
  const {
    workingSlot,
    selectedSlot,
    slots,
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    previewMode,
    compositeAssetIds,
    compositeAssetOptions,
  } = useSlotsState();
  const {
    setCompositeAssetIds,
    setSelectedFolder,
    setSelectedSlotId,
    setWorkingSlotId,
    setPreviewMode,
  } = useSlotsActions();
  const { promptText, paramsState, paramSpecs, paramUiOverrides } = usePromptState();
  const {
    setPromptText,
    setParamsState,
    setParamSpecs,
    setParamUiOverrides,
    setExtractReviewOpen,
    setExtractDraftPrompt,
  } = usePromptActions();
  const { studioSettings } = useSettingsState();
  const { runMutation, isRunInFlight, activeRunStatus } = useGenerationState();
  const { handleRunGeneration } = useGenerationActions();
  const { setStudioSettings } = useSettingsActions();

  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const [requestPreviewOpen, setRequestPreviewOpen] = useState(false);
  const [requestPreviewMode, setRequestPreviewMode] = useState<RequestPreviewMode>('without_sequence');
  const [promptControlOpen, setPromptControlOpen] = useState(false);
  const [promptSaveBusy, setPromptSaveBusy] = useState(false);
  const [sequenceRunBusy, setSequenceRunBusy] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'graph' | 'sequencing' | 'history'>('controls');
  const [historyMode, setHistoryMode] = useState<'actions' | 'runs'>('actions');
  const [quickActionsHostEl, setQuickActionsHostEl] = useState<HTMLElement | null>(null);
  const switchToControls = useCallback(() => setSidebarTab('controls'), []);

  const promptValidationSettings = useMemo(
    () => parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY)).promptValidation,
    [settingsStore]
  );

  const flattenedParams = useMemo(
    () => (paramsState ? flattenParams(paramsState).filter((leaf) => Boolean(leaf.path)) : []),
    [paramsState]
  );
  const hasExtractedControls = flattenedParams.length > 0;

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
  const workingSlotImageWidth = useMemo((): number | null => {
    const width = workingSlot?.imageFile?.width ?? null;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  }, [workingSlot?.imageFile?.width]);
  const workingSlotImageHeight = useMemo((): number | null => {
    const height = workingSlot?.imageFile?.height ?? null;
    return typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;
  }, [workingSlot?.imageFile?.height]);
  const sequenceImageContentFrame = useMemo((): { x: number; y: number; width: number; height: number } | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (frameBinding?.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame;
  }, [
    canvasImageOffset.x,
    canvasImageOffset.y,
    getPreviewCanvasImageFrame,
    previewMode,
    workingSlot?.id,
  ]);
  const generationBusy = runMutation.isPending || isRunInFlight;
  const generationLabel = generationBusy
    ? activeRunStatus === 'queued'
      ? 'Queued...'
      : 'Generating...'
    : `Generate From Prompt ${(studioSettings.targetAi.openai.image.n ?? 1) > 1 ? `(${studioSettings.targetAi.openai.image.n})` : ''}`;
  const hasCanvasImage = Boolean(
    workingSlot ||
    (selectedSlot && !isImageStudioSlotImageLocked(selectedSlot))
  );
  const canResetCanvasImageOffset = Math.abs(canvasImageOffset.x) > 0.5 || Math.abs(canvasImageOffset.y) > 0.5;
  const isMoveImageActive = imageTransformMode === 'move';
  const canRecenterCanvasImage = isMoveImageActive && canResetCanvasImageOffset;
  const isSelectToolActive = tool === 'select' && canvasSelectionEnabled;
  const activeShapeDrawingTool = tool === 'select' ? null : tool;

  const handleToggleSelectTool = useCallback((): void => {
    if (isSelectToolActive) {
      setCanvasSelectionEnabled(false);
      return;
    }
    setTool('select');
    setCanvasSelectionEnabled(true);
  }, [isSelectToolActive, setCanvasSelectionEnabled, setTool]);

  const handleSelectShapeTool = useCallback((nextTool: VectorToolMode): void => {
    const isTogglingActiveShapeToolOff = nextTool !== 'select' && tool === nextTool;
    if (isTogglingActiveShapeToolOff) {
      setTool('select');
      if (canvasSelectionEnabled) {
        setCanvasSelectionEnabled(false);
      }
      return;
    }

    setTool(nextTool);
    if (nextTool === 'select') {
      setCanvasSelectionEnabled(true);
      return;
    }
    if (canvasSelectionEnabled) {
      setCanvasSelectionEnabled(false);
    }
  }, [canvasSelectionEnabled, setCanvasSelectionEnabled, setTool, tool]);

  const applyActionHistorySnapshot = useCallback((snapshot: StudioActionHistorySnapshot): void => {
    setSelectedFolder(snapshot.selectedFolder);
    setSelectedSlotId(snapshot.selectedSlotId);
    setWorkingSlotId(snapshot.workingSlotId);
    setPreviewMode(snapshot.previewMode);
    setCompositeAssetIds(cloneSerializableValue(snapshot.compositeAssetIds));

    setTool(snapshot.tool);
    setCanvasSelectionEnabled(snapshot.canvasSelectionEnabled);
    setImageTransformMode(snapshot.imageTransformMode);
    setCanvasImageOffset(cloneSerializableValue(snapshot.canvasImageOffset));
    setMaskShapes(cloneSerializableValue(snapshot.maskShapes));
    setActiveMaskId(snapshot.activeMaskId);
    setSelectedPointIndex(snapshot.selectedPointIndex);
    setMaskInvert(snapshot.maskInvert);
    setMaskFeather(snapshot.maskFeather);
    setBrushRadius(snapshot.brushRadius);

    setPromptText(snapshot.promptText);
    setParamsState(cloneSerializableValue(snapshot.paramsState));
    setParamSpecs(cloneSerializableValue(snapshot.paramSpecs) as Record<string, ParamSpec> | null);
    setParamUiOverrides(cloneSerializableValue(snapshot.paramUiOverrides) as Record<string, ParamUiControl>);

    setStudioSettings(cloneSerializableValue(snapshot.studioSettings) as typeof studioSettings);
    setValidatorEnabled(snapshot.validatorEnabled);
    if (snapshot.validatorEnabled) {
      setFormatterEnabled(snapshot.formatterEnabled);
    } else {
      setFormatterEnabled(false);
    }
  }, [
    setSelectedFolder,
    setSelectedSlotId,
    setWorkingSlotId,
    setPreviewMode,
    setCompositeAssetIds,
    setTool,
    setCanvasSelectionEnabled,
    setImageTransformMode,
    setCanvasImageOffset,
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
    studioSettings,
    setValidatorEnabled,
    setFormatterEnabled,
  ]);

  const actionHistorySnapshotInput = useMemo(() => ({
    activeMaskId,
    brushRadius,
    canvasImageOffset,
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

  useEffect(() => {
    setHistoryMode('actions');
  }, [projectId]);

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

  const handleClearAllShapes = useCallback((): void => {
    if (maskShapes.length === 0) return;
    setMaskShapes([]);
    setActiveMaskId(null);
    setSelectedPointIndex(null);
    toast('All shapes removed from canvas.', { variant: 'info' });
  }, [maskShapes.length, setActiveMaskId, setMaskShapes, setSelectedPointIndex, toast]);

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
        : JSON.stringify(
          {
            errors: requestPreview.errors,
          },
          null,
          2
        ),
    [requestPreview]
  );

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
    studioSettings: studioSettings as unknown as Record<string, unknown> & {
      projectSequencing: { enabled: boolean };
    },
    toast,
    workingSlot,
    workingSlotImageWidth,
    workingSlotImageHeight,
    imageContentFrame: sequenceImageContentFrame,
  });

  const activeRequestPreview = requestPreviewMode === 'with_sequence'
    ? sequenceRequestPreview
    : requestPreview;
  const activeRequestPreviewJson = requestPreviewMode === 'with_sequence'
    ? sequenceRequestPreviewJson
    : generationRequestPreviewJson;
  const activeRequestPreviewEndpoint = requestPreviewMode === 'with_sequence'
    ? '/api/image-studio/sequences/run'
    : '/api/image-studio/run';

  const handleSavePromptToProject = useCallback((): void => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    const projectSessionKey = getImageStudioProjectSessionKey(normalizedProjectId);
    if (!projectSessionKey) {
      toast('Invalid project id.', { variant: 'error' });
      return;
    }
    if (promptSaveBusy) return;

    const projectSession: ImageStudioProjectSession = {
      version: 1,
      projectId: normalizedProjectId,
      savedAt: new Date().toISOString(),
      selectedFolder,
      selectedSlotId,
      workingSlotId,
      compositeAssetIds: cloneSerializableValue(compositeAssetIds),
      previewMode,
      promptText,
      paramsState: cloneSerializableValue(paramsState),
      paramSpecs: cloneSerializableValue((paramSpecs ?? null) as Record<string, unknown> | null),
      paramUiOverrides: cloneSerializableValue((paramUiOverrides ?? {}) as Record<string, unknown>),
    };

    setPromptSaveBusy(true);
    void (async (): Promise<void> => {
      let serializedSession: string;
      try {
        serializedSession = serializeImageStudioProjectSession(projectSession);
      } catch (error: unknown) {
        throw new Error(
          error instanceof Error
            ? `Failed to serialize prompt session: ${error.message}`
            : 'Failed to serialize prompt session.'
        );
      }

      try {
        saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
      } catch {
        // Local cache is best-effort.
      }

      await updateSetting.mutateAsync({
        key: projectSessionKey,
        value: serializedSession,
      });

      toast(`Prompt saved to project "${normalizedProjectId}".`, { variant: 'success' });
    })()
      .catch((error: unknown) => {
        let localFallbackSaved = false;
        try {
          saveImageStudioProjectSessionLocal(normalizedProjectId, projectSession);
          localFallbackSaved = true;
        } catch {
          localFallbackSaved = false;
        }
        if (localFallbackSaved) {
          toast(
            error instanceof Error
              ? `Cloud save failed. Prompt saved locally: ${error.message}`
              : 'Cloud save failed. Prompt saved locally.',
            { variant: 'warning' }
          );
          return;
        }
        toast(
          error instanceof Error
            ? `Failed to save prompt: ${error.message}`
            : 'Failed to save prompt.',
          { variant: 'error' }
        );
      })
      .finally(() => {
        setPromptSaveBusy(false);
      });
  }, [
    projectId,
    promptSaveBusy,
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    compositeAssetIds,
    previewMode,
    promptText,
    paramsState,
    paramSpecs,
    paramUiOverrides,
    updateSetting,
    toast,
  ]);

  const preparePromptForExtraction = (): string => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return promptText;
    if (!validatorEnabled) return promptText;

    let nextPrompt = promptText;
    try {
      const beforeIssues = validateProgrammaticPrompt(
        nextPrompt,
        promptValidationSettings,
        { scope: 'image_studio_prompt' }
      );
      if (!formatterEnabled) {
        if (beforeIssues.length === 0) {
          toast('Prompt validation passed.', { variant: 'success' });
        } else {
          toast(`Prompt validation found ${beforeIssues.length} issue(s).`, { variant: 'warning' });
        }
        return nextPrompt;
      }

      const result = formatProgrammaticPrompt(
        nextPrompt,
        promptValidationSettings,
        { scope: 'image_studio_prompt' },
        { precomputedIssuesBefore: beforeIssues }
      );
      if (result.changed) {
        nextPrompt = result.prompt;
        setPromptText(result.prompt);
      }
      toast(
        result.changed
          ? `Formatted prompt. Validation issues: ${beforeIssues.length} -> ${result.issuesAfter}.`
          : `No formatter changes applied. Validation issues: ${beforeIssues.length}.`,
        { variant: result.changed ? 'success' : 'info' }
      );
      return nextPrompt;
    } catch (error) {
      logClientError(error, {
        context: { source: 'RightSidebar', action: 'preparePromptForExtraction', level: 'error' },
      });
      toast(
        error instanceof Error
          ? error.message
          : formatterEnabled
            ? 'Failed to format prompt.'
            : 'Failed to validate prompt.',
        { variant: 'error' }
      );
      return promptText;
    }
  };

  const handleExtractReviewOpen = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    const preparedPrompt = preparePromptForExtraction();
    setExtractDraftPrompt(preparedPrompt);
    setExtractReviewOpen(true);
  };

  const handleOpenPromptExploder = (): void => {
    if (!promptText.trim()) {
      toast('Enter prompt text first.', { variant: 'info' });
      return;
    }
    savePromptExploderDraftPrompt(promptText);
    router.push(
      '/admin/prompt-exploder?source=image-studio&returnTo=%2Fadmin%2Fimage-studio'
    );
  };

  const promptControlHeader = (
    <RightSidebarPromptControlHeader
      onClose={() => setPromptControlOpen(false)}
      onOpenPromptExploder={() => {
        setPromptControlOpen(false);
        handleOpenPromptExploder();
      }}
      onSave={handleSavePromptToProject}
      projectId={projectId}
      promptSaveBusy={promptSaveBusy}
      promptText={promptText}
    />
  );

  const quickActionsPanelContent = (
    <RightSidebarQuickActions
      estimatedGenerationCost={estimatedGenerationCost}
      estimatedPromptTokens={estimatedPromptTokens}
      generationBusy={generationBusy}
      generationLabel={generationLabel}
      hasExtractedControls={hasExtractedControls}
      modelSupportsSequenceGeneration={modelSupportsSequenceGeneration}
      modelValue={studioSettings.targetAi.openai.model}
      onModelChange={(value: string) => {
        setStudioSettings((prev) => ({
          ...prev,
          targetAi: {
            ...prev.targetAi,
            openai: {
              ...prev.targetAi.openai,
              api: 'images',
              model: value,
            },
          },
        }));
      }}
      onOpenControls={() => setControlsOpen(true)}
      onOpenPromptControl={() => setPromptControlOpen(true)}
      onOpenRequestPreview={() => setRequestPreviewOpen(true)}
      onRunGeneration={handleRunGeneration}
      onRunSequenceGeneration={handleRunSequenceGeneration}
      quickModelOptions={quickModelOptions}
      selectedModelId={selectedModelId}
      sequenceRunBusy={sequenceRunBusy}
    />
  );

  return (
    <>
      <RightSidebarProvider value={{ switchToControls }}>
        <div
          className={cn(
            'order-3 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 transition-all duration-300 ease-in-out',
            isFocusMode && 'pointer-events-none opacity-0 translate-x-2'
          )}
          aria-hidden={isFocusMode}
        >
          {/* Tab toggle */}
          <div className='grid grid-cols-4 border-b border-border/40'>
            <Button size='xs'
              type='button'
              variant='ghost'
              className={cn(
                'h-auto flex-1 rounded-none px-3 py-1.5 text-[11px] font-medium transition-colors',
                sidebarTab === 'controls'
                  ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setSidebarTab('controls')}
            >
            Controls
            </Button>
            <Button size='xs'
              type='button'
              variant='ghost'
              className={cn(
                'h-auto flex-1 rounded-none px-3 py-1.5 text-[11px] font-medium transition-colors',
                sidebarTab === 'graph'
                  ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setSidebarTab('graph')}
            >
              <GitBranch className='mr-1 inline size-3' />
            Version Graph
            </Button>
            <Button size='xs'
              type='button'
              variant='ghost'
              className={cn(
                'h-auto flex-1 rounded-none px-3 py-1.5 text-[11px] font-medium transition-colors',
                sidebarTab === 'sequencing'
                  ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setSidebarTab('sequencing')}
            >
              <Workflow className='mr-1 inline size-3' />
            Sequencing
            </Button>
            <Button size='xs'
              type='button'
              variant='ghost'
              className={cn(
                'h-auto flex-1 rounded-none px-3 py-1.5 text-[11px] font-medium transition-colors',
                sidebarTab === 'history'
                  ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              onClick={() => setSidebarTab('history')}
            >
              <Clock3 className='mr-1 inline size-3' />
            History
            </Button>
          </div>

          <div className='flex items-center justify-between border-b border-border/30 bg-card/30 px-3 py-1.5'>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>
              Action History {activeActionHistoryIndex >= 0 ? `${activeActionHistoryIndex + 1}/${actionHistoryEntries.length}` : '0/0'}
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                size='xs'
                type='button'
                variant='outline'
                className='h-6 px-2 text-[10px]'
                onClick={handleUndoAction}
                disabled={!canUndoAction}
                title='Undo last action'
                aria-label='Undo last action'
              >
                <Undo2 className='mr-1 size-3' />
                Undo
              </Button>
              <Button
                size='xs'
                type='button'
                variant='outline'
                className='h-6 px-2 text-[10px]'
                onClick={handleRedoAction}
                disabled={!canRedoAction}
                title='Redo last action'
                aria-label='Redo last action'
              >
                <Redo2 className='mr-1 size-3' />
                Redo
              </Button>
            </div>
          </div>

          {quickActionsHostEl
            ? createPortal(
              <div className='space-y-2 pb-2'>
                {quickActionsPanelContent}
              </div>,
              quickActionsHostEl
            )
            : null}

          {sidebarTab === 'graph' ? (
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
            <RightSidebarHistoryTab
              actionHistoryEntriesLength={actionHistoryEntries.length}
              actionHistoryItems={actionHistoryItems}
              actionHistoryMaxSteps={ACTION_HISTORY_MAX_STEPS}
              activeActionHistoryIndex={activeActionHistoryIndex}
              historyMode={historyMode}
              onHistoryModeChange={setHistoryMode}
              onRestoreActionStep={handleRestoreActionStep}
            />
          ) : (
            <RightSidebarControlsTab
              activeShapeDrawingTool={activeShapeDrawingTool}
              brushRadius={brushRadius}
              canRecenterCanvasImage={canRecenterCanvasImage}
              compositeAssetIds={compositeAssetIds}
              compositeAssetOptions={compositeAssetOptions}
              hasCanvasImage={hasCanvasImage}
              isMoveImageActive={isMoveImageActive}
              isSelectToolActive={isSelectToolActive}
              maskEdgeSensitivity={maskEdgeSensitivity}
              maskFeather={maskFeather}
              maskShapesLength={maskShapes.length}
              maskThresholdSensitivity={maskThresholdSensitivity}
              onBrushRadiusChange={setBrushRadius}
              onClearAllShapes={handleClearAllShapes}
              onCompositeAssetIdsChange={setCompositeAssetIds}
              onMaskEdgeSensitivityChange={setMaskEdgeSensitivity}
              onMaskFeatherChange={setMaskFeather}
              onMaskThresholdSensitivityChange={setMaskThresholdSensitivity}
              onRecenterCanvasImage={resetCanvasImageOffset}
              onSelectShapeTool={handleSelectShapeTool}
              onToggleMoveImage={() => {
                setImageTransformMode(isMoveImageActive ? 'none' : 'move');
              }}
              onToggleSelectTool={handleToggleSelectTool}
              quickActionsHostEl={quickActionsHostEl}
              quickActionsPanelContent={quickActionsPanelContent}
              tool={tool}
              workingSlotPresent={Boolean(workingSlot)}
            />
          )}
        </div>
      </RightSidebarProvider>

      <AppModal
        open={promptControlOpen}
        onClose={() => setPromptControlOpen(false)}
        title='Control Prompt'
        size='md'
        header={promptControlHeader}
        className='md:min-w-[63rem] max-w-[66rem] [&>div:first-child]:border-b-0'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Prompt</Label>
            <Textarea size='sm'
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              className='h-44 font-mono text-[11px]'
              placeholder='Paste prompt here...'
            />
          </div>

          <UIPresetsPanel />

          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <ValidatorFormatterToggle
              validatorLabel='Validate'
              formatterLabel='Format'
              validatorEnabled={validatorEnabled}
              formatterEnabled={formatterEnabled}
              onValidatorChange={setValidatorEnabled}
              onFormatterChange={setFormatterEnabled}
            />
          </div>

          <div className='flex items-center justify-end gap-2'>
            {modelSupportsSequenceGeneration ? (
              <Button
                size='xs'
                type='button'
                variant='outline'
                onClick={handleRunSequenceGeneration}
                disabled={generationBusy || sequenceRunBusy}
              >
                {sequenceRunBusy ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Workflow className='mr-2 size-4' />
                )}
                {sequenceRunBusy ? 'Starting Sequence...' : 'Generate Sequence'}
              </Button>
            ) : null}
            <Button
              size='xs'
              type='button'
              onClick={handleRunGeneration}
              disabled={!promptText.trim() || generationBusy || sequenceRunBusy}
            >
              {generationBusy ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Play className='mr-2 size-4' />
              )}
              Generate From Prompt
            </Button>
            <Button size='xs'
              variant='outline'
              title='Extract functions and selectors from prompt'
              aria-label='Extract functions and selectors from prompt'
              disabled={!promptText.trim()}
              onClick={() => {
                setPromptControlOpen(false);
                handleExtractReviewOpen();
              }}
            >
              <Sparkles className='mr-2 size-4' />
              Extract
            </Button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        title='Controls'
        size='lg'
      >
        <div className='space-y-4 text-sm text-gray-200'>
          {hasExtractedControls ? (
            <div className='max-h-[70vh] space-y-3 overflow-auto pr-1'>
              {flattenedParams.map((leaf) => (
                <ParamRow key={leaf.path} leaf={leaf} />
              ))}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              No extracted controls available yet.
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        open={requestPreviewOpen}
        onClose={() => setRequestPreviewOpen(false)}
        title='Generation Request Preview'
        size='xl'
      >
        <RightSidebarRequestPreviewBody
          activeErrors={activeRequestPreview.errors}
          activeImages={activeRequestPreview.images}
          activeRequestPreviewEndpoint={activeRequestPreviewEndpoint}
          activeRequestPreviewJson={activeRequestPreviewJson}
          maskShapeCount={activeRequestPreview.maskShapeCount}
          requestPreviewMode={requestPreviewMode}
          resolvedPromptLength={activeRequestPreview.resolvedPrompt.length}
          sequenceStepCount={sequenceRequestPreview.stepCount}
          setRequestPreviewMode={setRequestPreviewMode}
        />
      </AppModal>
    </>
  );
}
