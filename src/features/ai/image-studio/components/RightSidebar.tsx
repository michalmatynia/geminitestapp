'use client';

import { Clock3, GitBranch, Play, Redo2, Sparkles, Undo2, Workflow } from 'lucide-react';
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
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  Input,
  Label,
  Textarea,
  ValidatorFormatterToggle,
  useToast,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';
import { cn } from '@/shared/utils';

import { ImageStudioAnalysisTab } from './ImageStudioAnalysisTab';
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
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { usePromptActions, usePromptState } from '../context/PromptContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import {
  applyCanvasResizeLocalTransform,
  type CanvasResizeDirection,
} from '../utils/canvas-resize';
import { supportsImageSequenceGeneration } from '../utils/image-models';
import {
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '../utils/project-session';
import { buildRunRequestPreview } from '../utils/run-request-preview';
import { normalizeImageStudioModelPresets, resolveImageStudioSequenceActiveSteps } from '../utils/studio-settings';

import type { ParamUiControl } from '../utils/param-ui';

const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

type RequestPreviewMode = 'without_sequence' | 'with_sequence';

const CANVAS_RESIZE_MIN_PX = 64;
const CANVAS_RESIZE_MAX_PX = 32_768;

const parseCanvasDimensionInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (normalized < CANVAS_RESIZE_MIN_PX || normalized > CANVAS_RESIZE_MAX_PX) {
    return null;
  }
  return normalized;
};

const formatCanvasSizeLabel = (
  width: number | null,
  height: number | null
): string => {
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    typeof height !== 'number' ||
    !Number.isFinite(height)
  ) {
    return 'Auto';
  }
  return `${Math.floor(width)} x ${Math.floor(height)}`;
};

type CanvasSizePresetOption = {
  value: string;
  label: string;
  description: string;
};

const CANVAS_SIZE_PRESET_OPTIONS: CanvasSizePresetOption[] = [
  {
    value: '1024x1024',
    label: 'Square 1024 x 1024',
    description: 'Balanced square canvas.',
  },
  {
    value: '1536x1024',
    label: 'Landscape 1536 x 1024',
    description: 'Wider layout for horizontal compositions.',
  },
  {
    value: '1024x1536',
    label: 'Portrait 1024 x 1536',
    description: 'Taller layout for vertical compositions.',
  },
  {
    value: '2048x2048',
    label: 'Square 2048 x 2048',
    description: 'High-resolution square output.',
  },
  {
    value: '2048x1536',
    label: 'Landscape 2048 x 1536',
    description: 'High-resolution horizontal output.',
  },
  {
    value: '1536x2048',
    label: 'Portrait 1536 x 2048',
    description: 'High-resolution vertical output.',
  },
];

const parseCanvasSizePresetValue = (
  value: string
): { width: number; height: number } | null => {
  const [widthRaw, heightRaw] = value.split('x');
  if (!widthRaw || !heightRaw) return null;
  const width = parseCanvasDimensionInput(widthRaw);
  const height = parseCanvasDimensionInput(heightRaw);
  if (width === null || height === null) return null;
  return { width, height };
};

const CANVAS_RESIZE_DIRECTION_OPTIONS: Array<{
  value: CanvasResizeDirection;
  arrow: string;
  label: string;
  description: string;
}> = [
  {
    value: 'up-left',
    arrow: '^<',
    label: 'Extend Up + Left',
    description: 'Adds new canvas area above and left of current content.',
  },
  {
    value: 'up',
    arrow: '^',
    label: 'Extend Up',
    description: 'Adds new canvas area above current content.',
  },
  {
    value: 'up-right',
    arrow: '^>',
    label: 'Extend Up + Right',
    description: 'Adds new canvas area above and right of current content.',
  },
  {
    value: 'left',
    arrow: '<',
    label: 'Extend Left',
    description: 'Adds new canvas area left of current content.',
  },
  {
    value: 'center',
    arrow: '+',
    label: 'Extend From Center',
    description: 'Splits extension evenly around current content.',
  },
  {
    value: 'right',
    arrow: '>',
    label: 'Extend Right',
    description: 'Adds new canvas area right of current content.',
  },
  {
    value: 'down-left',
    arrow: 'v<',
    label: 'Extend Down + Left',
    description: 'Adds new canvas area below and left of current content.',
  },
  {
    value: 'down',
    arrow: 'v',
    label: 'Extend Down',
    description: 'Adds new canvas area below current content.',
  },
  {
    value: 'down-right',
    arrow: 'v>',
    label: 'Extend Down + Right',
    description: 'Adds new canvas area below and right of current content.',
  },
];

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
  const { handleResizeProjectCanvas, resizeProjectCanvasMutation } = useProjectsActions();
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
  const extractBusy: 'none' | 'programmatic' | 'smart' | 'ai' | 'ui' = 'none';
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resizeCanvasOpen, setResizeCanvasOpen] = useState(false);
  const [resizeCanvasWidthDraft, setResizeCanvasWidthDraft] = useState('');
  const [resizeCanvasHeightDraft, setResizeCanvasHeightDraft] = useState('');
  const [resizeCanvasDirection, setResizeCanvasDirection] =
    useState<CanvasResizeDirection>('down-right');
  const [canvasSizePresetValue, setCanvasSizePresetValue] = useState('1024x1024');
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'analysis' | 'graph' | 'sequencing' | 'history'>('controls');
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
  const projectCanvasWidthPx = useMemo((): number | null => {
    const width = activeProject?.canvasWidthPx ?? null;
    if (typeof width !== 'number' || !Number.isFinite(width)) return null;
    const normalized = Math.floor(width);
    if (
      normalized < CANVAS_RESIZE_MIN_PX ||
      normalized > CANVAS_RESIZE_MAX_PX
    ) {
      return null;
    }
    return normalized;
  }, [activeProject?.canvasWidthPx]);
  const projectCanvasHeightPx = useMemo((): number | null => {
    const height = activeProject?.canvasHeightPx ?? null;
    if (typeof height !== 'number' || !Number.isFinite(height)) return null;
    const normalized = Math.floor(height);
    if (
      normalized < CANVAS_RESIZE_MIN_PX ||
      normalized > CANVAS_RESIZE_MAX_PX
    ) {
      return null;
    }
    return normalized;
  }, [activeProject?.canvasHeightPx]);
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
  const selectedCanvasSizePreset = useMemo(
    () => parseCanvasSizePresetValue(canvasSizePresetValue),
    [canvasSizePresetValue]
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
  const resizeCanvasDirectionMeta = useMemo(
    () =>
      CANVAS_RESIZE_DIRECTION_OPTIONS.find(
        (option) => option.value === resizeCanvasDirection
      ) ?? CANVAS_RESIZE_DIRECTION_OPTIONS[8]!,
    [resizeCanvasDirection]
  );
  const resizeCanvasWidthValue = useMemo(
    () => parseCanvasDimensionInput(resizeCanvasWidthDraft),
    [resizeCanvasWidthDraft]
  );
  const resizeCanvasHeightValue = useMemo(
    () => parseCanvasDimensionInput(resizeCanvasHeightDraft),
    [resizeCanvasHeightDraft]
  );
  const canSubmitResizeCanvas = useMemo(() => {
    if (!projectId.trim()) return false;
    if (resizeProjectCanvasMutation.isPending) return false;
    if (resizeCanvasWidthValue === null || resizeCanvasHeightValue === null) {
      return false;
    }
    if (
      resizeCanvasWidthValue === fallbackCanvasWidthPx &&
      resizeCanvasHeightValue === fallbackCanvasHeightPx
    ) {
      return false;
    }
    return true;
  }, [
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    projectId,
    resizeCanvasHeightValue,
    resizeCanvasWidthValue,
    resizeProjectCanvasMutation.isPending,
  ]);
  const canApplyCanvasSizePreset = useMemo(() => {
    if (!projectId.trim()) return false;
    if (resizeProjectCanvasMutation.isPending) return false;
    if (!selectedCanvasSizePreset) return false;
    return !(
      selectedCanvasSizePreset.width === fallbackCanvasWidthPx &&
      selectedCanvasSizePreset.height === fallbackCanvasHeightPx
    );
  }, [
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    projectId,
    resizeProjectCanvasMutation.isPending,
    selectedCanvasSizePreset,
  ]);
  const resizeCanvasDisabled = !projectId.trim();
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
  const canResetCanvasImageOffset = Math.abs(canvasImageOffset.x) > 0.5 || Math.abs(canvasImageOffset.y) > 0.5;
  const isMoveImageActive = imageTransformMode === 'move';
  const canRecenterCanvasImage = isMoveImageActive && canResetCanvasImageOffset;

  const runCanvasResize = useCallback(async ({
    nextWidth,
    nextHeight,
    direction,
    closeModalOnSuccess = false,
  }: {
    nextWidth: number;
    nextHeight: number;
    direction: CanvasResizeDirection;
    closeModalOnSuccess?: boolean;
  }): Promise<void> => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project before resizing canvas.', { variant: 'info' });
      return;
    }
    if (
      nextWidth < CANVAS_RESIZE_MIN_PX ||
      nextWidth > CANVAS_RESIZE_MAX_PX ||
      nextHeight < CANVAS_RESIZE_MIN_PX ||
      nextHeight > CANVAS_RESIZE_MAX_PX
    ) {
      toast(
        `Canvas width and height must be between ${CANVAS_RESIZE_MIN_PX} and ${CANVAS_RESIZE_MAX_PX}.`,
        { variant: 'error' }
      );
      return;
    }

    const oldWidth = fallbackCanvasWidthPx;
    const oldHeight = fallbackCanvasHeightPx;
    if (nextWidth === oldWidth && nextHeight === oldHeight) {
      if (closeModalOnSuccess) {
        setResizeCanvasOpen(false);
      }
      return;
    }
    const sourceAspectRatio =
      typeof workingSlotImageWidth === 'number' &&
      Number.isFinite(workingSlotImageWidth) &&
      workingSlotImageWidth > 0 &&
      typeof workingSlotImageHeight === 'number' &&
      Number.isFinite(workingSlotImageHeight) &&
      workingSlotImageHeight > 0
        ? workingSlotImageWidth / workingSlotImageHeight
        : null;

    const transform = applyCanvasResizeLocalTransform({
      shapes: maskShapes,
      oldCanvasWidth: oldWidth,
      oldCanvasHeight: oldHeight,
      newCanvasWidth: nextWidth,
      newCanvasHeight: nextHeight,
      direction,
      currentImageOffset: canvasImageOffset,
      currentImageFrame: sequenceImageContentFrame,
      sourceAspectRatio,
    });

    await handleResizeProjectCanvas({
      projectId: normalizedProjectId,
      canvasWidthPx: nextWidth,
      canvasHeightPx: nextHeight,
    });

    setMaskShapes(transform.shapes);
    setCanvasImageOffset(transform.imageOffset);
    if (closeModalOnSuccess) {
      setResizeCanvasOpen(false);
    }
  }, [
    canvasImageOffset,
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    handleResizeProjectCanvas,
    maskShapes,
    projectId,
    sequenceImageContentFrame,
    setCanvasImageOffset,
    setMaskShapes,
    setResizeCanvasOpen,
    toast,
    workingSlotImageHeight,
    workingSlotImageWidth,
  ]);

  const handleOpenResizeCanvasModal = useCallback((): void => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project before resizing canvas.', { variant: 'info' });
      return;
    }
    setResizeCanvasWidthDraft(
      String(selectedCanvasSizePreset?.width ?? fallbackCanvasWidthPx)
    );
    setResizeCanvasHeightDraft(
      String(selectedCanvasSizePreset?.height ?? fallbackCanvasHeightPx)
    );
    setResizeCanvasDirection('down-right');
    setResizeCanvasOpen(true);
  }, [
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    projectId,
    selectedCanvasSizePreset,
    toast,
  ]);

  const handleResizeCanvasSubmit = useCallback(async (): Promise<void> => {
    const nextWidth = resizeCanvasWidthValue;
    const nextHeight = resizeCanvasHeightValue;
    if (nextWidth === null || nextHeight === null) {
      toast(
        `Canvas width and height must be between ${CANVAS_RESIZE_MIN_PX} and ${CANVAS_RESIZE_MAX_PX}.`,
        { variant: 'error' }
      );
      return;
    }
    await runCanvasResize({
      nextWidth,
      nextHeight,
      direction: resizeCanvasDirection,
      closeModalOnSuccess: true,
    });
  }, [resizeCanvasDirection, resizeCanvasHeightValue, resizeCanvasWidthValue, runCanvasResize, toast]);

  const handleApplyCanvasSizePreset = useCallback(async (): Promise<void> => {
    if (!selectedCanvasSizePreset) {
      toast('Select a valid canvas size before applying.', { variant: 'error' });
      return;
    }
    await runCanvasResize({
      nextWidth: selectedCanvasSizePreset.width,
      nextHeight: selectedCanvasSizePreset.height,
      direction: 'down-right',
    });
  }, [runCanvasResize, selectedCanvasSizePreset, toast]);

  const handleCloseResizeCanvasModal = useCallback((): void => {
    if (resizeProjectCanvasMutation.isPending) return;
    setResizeCanvasOpen(false);
  }, [resizeProjectCanvasMutation.isPending]);

  const applyActionHistorySnapshot = useCallback((snapshot: StudioActionHistorySnapshot): void => {
    setSelectedFolder(snapshot.selectedFolder);
    setWorkingSlotId(snapshot.workingSlotId);
    setPreviewMode(snapshot.previewMode);
    setCompositeAssetIds(cloneSerializableValue(snapshot.compositeAssetIds));
    
    setTool(snapshot.tool);
    setCanvasSelectionEnabled(snapshot.canvasSelectionEnabled);
    
    setImageTransformMode(snapshot.imageTransformMode);    setCanvasImageOffset(cloneSerializableValue(snapshot.canvasImageOffset));
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
    studioSettings,
    setValidatorEnabled,
    setFormatterEnabled,
  ]);

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
    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [projectId, sidebarTab]);

  const handleModelChange = useCallback((value: string): void => {
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
  }, [setStudioSettings]);

  const handleOpenControls = useCallback((): void => {
    setControlsOpen(true);
  }, []);

  const handleOpenPromptControl = useCallback((): void => {
    setPromptControlOpen(true);
  }, []);

  const handleOpenRequestPreview = useCallback((): void => {
    setRequestPreviewOpen(true);
  }, []);

  const handleApplyCanvasSizePresetClick = useCallback((): void => {
    void handleApplyCanvasSizePreset();
  }, [handleApplyCanvasSizePreset]);

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
            : 'Failed to serialize prompt session.',
          { cause: error }
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
        let localFallbackSaved: boolean;
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

  const quickActionsPanelContent = useMemo(() => (
    <RightSidebarQuickActions
      estimatedGenerationCost={estimatedGenerationCost}
      estimatedPromptTokens={estimatedPromptTokens}
      generationBusy={generationBusy}
      generationLabel={generationLabel}
      hasExtractedControls={hasExtractedControls}
      modelSupportsSequenceGeneration={modelSupportsSequenceGeneration}
      modelValue={studioSettings.targetAi.openai.model}
      onModelChange={handleModelChange}
      onOpenControls={handleOpenControls}
      onOpenPromptControl={handleOpenPromptControl}
      onOpenRequestPreview={handleOpenRequestPreview}
      onRunGeneration={handleRunGeneration}
      onRunSequenceGeneration={handleRunSequenceGeneration}
      quickModelOptions={quickModelOptions}
      selectedModelId={selectedModelId}
      sequenceRunBusy={sequenceRunBusy}
    />
  ), [
    estimatedGenerationCost,
    estimatedPromptTokens,
    generationBusy,
    generationLabel,
    handleModelChange,
    handleOpenControls,
    handleOpenPromptControl,
    handleOpenRequestPreview,
    handleRunGeneration,
    handleRunSequenceGeneration,
    hasExtractedControls,
    modelSupportsSequenceGeneration,
    quickModelOptions,
    selectedModelId,
    sequenceRunBusy,
    studioSettings.targetAi.openai.model,
  ]);

  const contextValue = useMemo(
    (): RightSidebarContextValue => ({
      switchToControls,
      canvasSizePresetOptions,
      canvasSizePresetValue,
      setCanvasSizePresetValue,
      canvasSizeLabel: projectCanvasSizeLabel,
      canApplyCanvasSizePreset,
      canRecenterCanvasImage,
      onApplyCanvasSizePreset: handleApplyCanvasSizePresetClick,
      onOpenResizeCanvasModal: handleOpenResizeCanvasModal,
      quickActionsHostEl,
      quickActionsPanelContent,
      resizeCanvasDisabled,

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
      activeImages: activeRequestPreview.images,
      activeRequestPreviewEndpoint,
      activeRequestPreviewJson,
      maskShapeCount: activeRequestPreview.maskShapeCount,
      requestPreviewMode,
      resolvedPromptLength: activeRequestPreview.resolvedPrompt.length,
      sequenceStepCount: sequenceRequestPreview.stepCount,
      setRequestPreviewMode,
    }),
    [
      switchToControls,
      canvasSizePresetOptions,
      canvasSizePresetValue,
      projectCanvasSizeLabel,
      canApplyCanvasSizePreset,
      canRecenterCanvasImage,
      handleApplyCanvasSizePresetClick,
      handleOpenResizeCanvasModal,
      quickActionsHostEl,
      quickActionsPanelContent,
      resizeCanvasDisabled,
      actionHistoryEntries.length,
      actionHistoryItems,
      activeActionHistoryIndex,
      historyMode,
      handleRestoreActionStep,
      activeRequestPreview,
      activeRequestPreviewEndpoint,
      activeRequestPreviewJson,
      requestPreviewMode,
      sequenceRequestPreview.stepCount,
      setRequestPreviewMode,
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
        {/* Tab toggle */}
        <div className='grid grid-cols-5 border-b border-border/40'>
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
              sidebarTab === 'analysis'
                ? 'border-b-2 border-blue-400 text-gray-200 hover:bg-transparent'
                : 'text-gray-500 hover:text-gray-300'
            )}
            onClick={() => setSidebarTab('analysis')}
          >
            <Sparkles className='mr-1 inline size-3' />
          Analysis
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

      <DetailModal
        isOpen={promptControlOpen}
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
                loading={sequenceRunBusy}
              >
                <Workflow className='mr-2 size-4' />
                {sequenceRunBusy ? 'Starting Sequence...' : 'Generate Sequence'}
              </Button>            ) : null}
            <Button
              size='xs'
              type='button'
              onClick={handleRunGeneration}
              disabled={!promptText.trim() || generationBusy || sequenceRunBusy}
              loading={generationBusy}
            >
              <Play className='mr-2 size-4' />
              Generate From Prompt
            </Button>
            <Button size='xs'
              variant='outline'
              title='Extract functions and selectors from prompt'
              aria-label='Extract functions and selectors from prompt'
              disabled={!promptText.trim() || extractBusy !== 'none'}
              onClick={() => {
                setPromptControlOpen(false);
                handleExtractReviewOpen();
              }}
              loading={extractBusy !== 'none'}
            >
              <Sparkles className='mr-2 size-4' />
              Extract
            </Button>
          </div>
        </div>
      </DetailModal>

      <DetailModal
        isOpen={controlsOpen}
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
      </DetailModal>

      <DetailModal
        isOpen={resizeCanvasOpen}
        onClose={handleCloseResizeCanvasModal}
        title='Resize Canvas'
        size='md'
        footer={
          <div className='flex items-center justify-end gap-2'>
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleCloseResizeCanvasModal}
              disabled={resizeProjectCanvasMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size='xs'
              type='button'
              onClick={() => {
                void handleResizeCanvasSubmit();
              }}
              disabled={!canSubmitResizeCanvas}
              loading={resizeProjectCanvasMutation.isPending}
              loadingText='Applying...'
            >
              Apply Resize
            </Button>
          </div>
        }
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='text-xs text-gray-400'>
            Current canvas: {projectCanvasSizeLabel}
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Width (px)</Label>
              <Input
                size='sm'
                type='number'
                min={CANVAS_RESIZE_MIN_PX}
                max={CANVAS_RESIZE_MAX_PX}
                step={1}
                value={resizeCanvasWidthDraft}
                onChange={(event) => setResizeCanvasWidthDraft(event.target.value)}
                className={cn(
                  'h-9',
                  resizeCanvasWidthValue === null && 'border-red-400/60'
                )}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleResizeCanvasSubmit();
                  }
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-gray-400'>Height (px)</Label>
              <Input
                size='sm'
                type='number'
                min={CANVAS_RESIZE_MIN_PX}
                max={CANVAS_RESIZE_MAX_PX}
                step={1}
                value={resizeCanvasHeightDraft}
                onChange={(event) => setResizeCanvasHeightDraft(event.target.value)}
                className={cn(
                  'h-9',
                  resizeCanvasHeightValue === null && 'border-red-400/60'
                )}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleResizeCanvasSubmit();
                  }
                }}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>
              Extension Direction
            </Label>
            <div className='grid grid-cols-3 gap-2'>
              {CANVAS_RESIZE_DIRECTION_OPTIONS.map((directionOption) => {
                const selected = directionOption.value === resizeCanvasDirection;
                return (
                  <Button
                    key={directionOption.value}
                    size='xs'
                    type='button'
                    variant={selected ? 'default' : 'outline'}
                    onClick={() => setResizeCanvasDirection(directionOption.value)}
                    className={cn(
                      'h-10 px-2 text-xs',
                      selected &&
                        'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                    )}
                    title={directionOption.label}
                    aria-label={directionOption.label}
                  >
                    {directionOption.arrow}
                  </Button>
                );
              })}
            </div>
            <div className='text-[11px] text-gray-500'>
              {resizeCanvasDirectionMeta.description}
            </div>
          </div>

          <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-400'>
            <div>
              New canvas:{' '}
              {resizeCanvasWidthValue !== null &&
              resizeCanvasHeightValue !== null
                ? `${resizeCanvasWidthValue} x ${resizeCanvasHeightValue}`
                : 'Invalid dimensions'}
            </div>
            <div className='mt-1'>
              Direction: {resizeCanvasDirectionMeta.label}
            </div>
          </div>
        </div>
      </DetailModal>

      <DetailModal
        isOpen={requestPreviewOpen}
        onClose={() => setRequestPreviewOpen(false)}
        title='Generation Request Preview'
        size='xl'
      >
        <RightSidebarRequestPreviewBody />
      </DetailModal>
    </RightSidebarProvider>
  );
}
