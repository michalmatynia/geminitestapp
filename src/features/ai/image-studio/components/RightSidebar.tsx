'use client';

import { Clock3, GitBranch, Loader2, Play, Redo2, Sparkles, Undo2, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type VectorShape,
  type VectorToolMode,
} from '@/features/vector-drawing';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
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
import { RightSidebarControlsTab } from './right-sidebar/RightSidebarControlsTab';
import { RightSidebarHistoryTab } from './right-sidebar/RightSidebarHistoryTab';
import { RightSidebarPromptControlHeader } from './right-sidebar/RightSidebarPromptControlHeader';
import { RightSidebarQuickActions } from './right-sidebar/RightSidebarQuickActions';
import { RightSidebarRequestPreviewBody } from './right-sidebar/RightSidebarRequestPreviewBody';
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
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  getImageStudioProjectSessionKey,
  saveImageStudioProjectSessionLocal,
  serializeImageStudioActiveProject,
  serializeImageStudioProjectSession,
  type ImageStudioProjectSession,
} from '../utils/project-session';
import { buildRunRequestPreview, resolvePromptPlaceholders } from '../utils/run-request-preview';
import { isImageStudioSlotImageLocked } from '../utils/slot-image-lock';
import { normalizeImageStudioModelPresets, resolveImageStudioSequenceActiveSteps } from '../utils/studio-settings';

import type { ImageStudioSlotRecord } from '../types';
import type { ParamUiControl } from '../utils/param-ui';
import type { RequestPreviewImage } from '../utils/run-request-preview';

const CHARS_PER_TOKEN_ESTIMATE = 4;
type ModelCostProfile = {
  imageUsdPerImage: number;
  inputUsdPer1KTokens: number;
};

const DEFAULT_MODEL_COST_PROFILE: ModelCostProfile = {
  imageUsdPerImage: 0.03,
  inputUsdPer1KTokens: 0.004,
};

const MODEL_COST_PROFILES: Array<{ prefix: string; profile: ModelCostProfile }> = [
  { prefix: 'gpt-image-1', profile: { imageUsdPerImage: 0.04, inputUsdPer1KTokens: 0.006 } },
  { prefix: 'gpt-5.2', profile: { imageUsdPerImage: 0.05, inputUsdPer1KTokens: 0.01 } },
  { prefix: 'gpt-5', profile: { imageUsdPerImage: 0.045, inputUsdPer1KTokens: 0.009 } },
  { prefix: 'gpt-4.1-mini', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.003 } },
  { prefix: 'gpt-4.1', profile: { imageUsdPerImage: 0.028, inputUsdPer1KTokens: 0.005 } },
  { prefix: 'gpt-4o-mini', profile: { imageUsdPerImage: 0.018, inputUsdPer1KTokens: 0.0025 } },
  { prefix: 'gpt-4o', profile: { imageUsdPerImage: 0.026, inputUsdPer1KTokens: 0.0045 } },
  { prefix: 'dall-e-3', profile: { imageUsdPerImage: 0.08, inputUsdPer1KTokens: 0.0 } },
  { prefix: 'dall-e-2', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.0 } },
];
const ACTION_HISTORY_MAX_STEPS = 10;
const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

type StudioActionHistorySnapshot = {
  selectedFolder: string;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: 'image' | '3d';
  compositeAssetIds: string[];
  tool: VectorToolMode;
  canvasSelectionEnabled: boolean;
  imageTransformMode: 'none' | 'move';
  canvasImageOffset: { x: number; y: number };
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  promptText: string;
  paramsState: Record<string, unknown> | null;
  paramSpecs: Record<string, unknown> | null;
  paramUiOverrides: Record<string, unknown>;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  studioSettings: Record<string, unknown>;
};

type StudioActionHistoryEntry = {
  id: string;
  label: string;
  createdAt: string;
  signature: string;
  snapshot: StudioActionHistorySnapshot;
};

type SequenceRunStartResponse = {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  dispatchMode: 'queued' | 'inline';
  currentSlotId: string;
  stepCount: number;
};

type RequestPreviewMode = 'without_sequence' | 'with_sequence';

type SequenceRequestPreview = {
  payload: Record<string, unknown> | null;
  errors: string[];
  resolvedPrompt: string;
  maskShapeCount: number;
  images: RequestPreviewImage[];
  stepCount: number;
};

const cloneSerializableValue = <T,>(value: T): T => {
  const seen = new WeakSet<object>();
  const serialized = JSON.stringify(value, (_key: string, candidate: unknown): unknown => {
    if (typeof candidate === 'bigint') return candidate.toString();
    if (typeof candidate === 'function' || typeof candidate === 'symbol') return undefined;
    if (candidate instanceof Date) return candidate.toISOString();
    if (candidate && typeof candidate === 'object') {
      if (seen.has(candidate)) return undefined;
      seen.add(candidate);
    }
    return candidate;
  });
  if (typeof serialized !== 'string') {
    return value;
  }
  return JSON.parse(serialized) as T;
};

const areStringArraysEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeMaskShapeToSequencePolygons = (
  shape: VectorShape
): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    return [
      shape.points.map((point: { x: number; y: number }) => ({
        x: clampUnit(point.x),
        y: clampUnit(point.y),
      })),
    ];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point: { x: number; y: number }) => point.x);
    const ys = shape.points.map((point: { x: number; y: number }) => point.y);
    const minX = clampUnit(Math.min(...xs));
    const maxX = clampUnit(Math.max(...xs));
    const minY = clampUnit(Math.min(...ys));
    const maxY = clampUnit(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point: { x: number; y: number }) => point.x);
    const ys = shape.points.map((point: { x: number; y: number }) => point.y);
    const minX = clampUnit(Math.min(...xs));
    const maxX = clampUnit(Math.max(...xs));
    const minY = clampUnit(Math.min(...ys));
    const maxY = clampUnit(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;

    return [
      Array.from({ length: steps }, (_value, index) => {
        const theta = (index / steps) * Math.PI * 2;
        return {
          x: clampUnit(cx + rx * Math.cos(theta)),
          y: clampUnit(cy + ry * Math.sin(theta)),
        };
      }),
    ];
  }

  return [];
};

const collectSequenceMaskPolygons = (
  shapes: VectorShape[]
): Array<Array<{ x: number; y: number }>> => {
  const eligibleShapes = shapes.filter((shape) => {
    if (!shape.visible) return false;
    if (shape.type === 'rect' || shape.type === 'ellipse') {
      return shape.points.length >= 2;
    }
    return shape.closed && shape.points.length >= 3;
  });

  return eligibleShapes.flatMap((shape) => normalizeMaskShapeToSequencePolygons(shape));
};

const estimatePromptTokens = (prompt: string): number => {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / CHARS_PER_TOKEN_ESTIMATE));
};

const resolveModelCostProfile = (model: string): ModelCostProfile => {
  const normalizedModel = model.trim().toLowerCase();
  if (!normalizedModel) return DEFAULT_MODEL_COST_PROFILE;
  const matched = MODEL_COST_PROFILES.find(({ prefix }) =>
    normalizedModel.startsWith(prefix)
  );
  return matched ? matched.profile : DEFAULT_MODEL_COST_PROFILE;
};

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
  const [actionHistoryEntries, setActionHistoryEntries] = useState<StudioActionHistoryEntry[]>([]);
  const [activeActionHistoryIndex, setActiveActionHistoryIndex] = useState(-1);
  const isApplyingActionHistoryRef = useRef(false);
  const applyingActionHistorySignatureRef = useRef<string | null>(null);
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
    setTool(nextTool);
    if (nextTool === 'select') {
      setCanvasSelectionEnabled(true);
      return;
    }
    if (canvasSelectionEnabled) {
      setCanvasSelectionEnabled(false);
    }
  }, [canvasSelectionEnabled, setCanvasSelectionEnabled, setTool]);

  const buildActionHistorySnapshot = useCallback((): StudioActionHistorySnapshot => ({
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    previewMode,
    compositeAssetIds: cloneSerializableValue(compositeAssetIds),
    tool,
    canvasSelectionEnabled,
    imageTransformMode,
    canvasImageOffset: cloneSerializableValue(canvasImageOffset),
    maskShapes: cloneSerializableValue(maskShapes),
    activeMaskId: typeof activeMaskId === 'string' ? String(activeMaskId) : null,
    selectedPointIndex: Number.isFinite(selectedPointIndex) ? Number(selectedPointIndex) : null,
    maskInvert,
    maskFeather,
    brushRadius,
    promptText,
    paramsState: cloneSerializableValue(paramsState),
    paramSpecs: cloneSerializableValue((paramSpecs ?? null) as Record<string, unknown> | null),
    paramUiOverrides: cloneSerializableValue((paramUiOverrides ?? {}) as Record<string, unknown>),
    validatorEnabled,
    formatterEnabled,
    studioSettings: cloneSerializableValue(studioSettings as Record<string, unknown>),
  }), [
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    previewMode,
    compositeAssetIds,
    tool,
    canvasSelectionEnabled,
    imageTransformMode,
    canvasImageOffset,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
    promptText,
    paramsState,
    paramSpecs,
    paramUiOverrides,
    validatorEnabled,
    formatterEnabled,
    studioSettings,
  ]);

  const resolveActionHistoryLabel = useCallback((
    previous: StudioActionHistorySnapshot | null,
    next: StudioActionHistorySnapshot
  ): string => {
    if (!previous) return 'Initial editor state';
    if (previous.promptText !== next.promptText) return 'Control prompt updated';
    if (previous.tool !== next.tool) return 'Drawing tool changed';
    if (previous.canvasSelectionEnabled !== next.canvasSelectionEnabled) return 'Select tool toggled';
    if (previous.imageTransformMode !== next.imageTransformMode) return 'Image transform tool changed';
    if (
      previous.canvasImageOffset.x !== next.canvasImageOffset.x ||
      previous.canvasImageOffset.y !== next.canvasImageOffset.y
    ) {
      return 'Canvas image position adjusted';
    }
    if (previous.maskShapes.length !== next.maskShapes.length) {
      return next.maskShapes.length > previous.maskShapes.length ? 'Shape added' : 'Shape removed';
    }
    if (JSON.stringify(previous.maskShapes) !== JSON.stringify(next.maskShapes)) return 'Shape edited';
    if (previous.activeMaskId !== next.activeMaskId || previous.selectedPointIndex !== next.selectedPointIndex) {
      return 'Shape selection changed';
    }
    if (
      previous.maskInvert !== next.maskInvert ||
      previous.maskFeather !== next.maskFeather ||
      previous.brushRadius !== next.brushRadius
    ) {
      return 'Mask settings changed';
    }
    if (
      previous.selectedFolder !== next.selectedFolder ||
      previous.selectedSlotId !== next.selectedSlotId ||
      previous.workingSlotId !== next.workingSlotId
    ) {
      return 'Card/folder selection changed';
    }
    if (previous.previewMode !== next.previewMode) return 'Preview mode changed';
    if (!areStringArraysEqual(previous.compositeAssetIds, next.compositeAssetIds)) {
      return 'Composite references changed';
    }
    if (
      JSON.stringify(previous.paramsState) !== JSON.stringify(next.paramsState) ||
      JSON.stringify(previous.paramSpecs) !== JSON.stringify(next.paramSpecs) ||
      JSON.stringify(previous.paramUiOverrides) !== JSON.stringify(next.paramUiOverrides)
    ) {
      return 'Control parameters changed';
    }
    if (
      previous.validatorEnabled !== next.validatorEnabled ||
      previous.formatterEnabled !== next.formatterEnabled
    ) {
      return 'Validator/formatter toggled';
    }
    if (JSON.stringify(previous.studioSettings) !== JSON.stringify(next.studioSettings)) {
      return 'Generation settings changed';
    }
    return 'Editor state changed';
  }, []);

  const applyActionHistoryEntry = useCallback((entry: StudioActionHistoryEntry): void => {
    const snapshot = entry.snapshot;
    isApplyingActionHistoryRef.current = true;
    applyingActionHistorySignatureRef.current = entry.signature;

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

  const handleUndoAction = useCallback((): void => {
    setActiveActionHistoryIndex((prevIndex) => {
      if (prevIndex <= 0) return prevIndex;
      const nextIndex = prevIndex - 1;
      const targetEntry = actionHistoryEntries[nextIndex];
      if (targetEntry) applyActionHistoryEntry(targetEntry);
      return nextIndex;
    });
  }, [actionHistoryEntries, applyActionHistoryEntry]);

  const handleRedoAction = useCallback((): void => {
    setActiveActionHistoryIndex((prevIndex) => {
      if (prevIndex < 0 || prevIndex >= actionHistoryEntries.length - 1) return prevIndex;
      const nextIndex = prevIndex + 1;
      const targetEntry = actionHistoryEntries[nextIndex];
      if (targetEntry) applyActionHistoryEntry(targetEntry);
      return nextIndex;
    });
  }, [actionHistoryEntries, applyActionHistoryEntry]);

  const handleRestoreActionStep = useCallback((targetIndex: number): void => {
    if (targetIndex < 0 || targetIndex >= actionHistoryEntries.length) return;
    if (targetIndex === activeActionHistoryIndex) return;
    const targetEntry = actionHistoryEntries[targetIndex];
    if (!targetEntry) return;
    applyActionHistoryEntry(targetEntry);
    setActiveActionHistoryIndex(targetIndex);
  }, [actionHistoryEntries, activeActionHistoryIndex, applyActionHistoryEntry]);

  const canUndoAction = activeActionHistoryIndex > 0;
  const canRedoAction = activeActionHistoryIndex >= 0 && activeActionHistoryIndex < actionHistoryEntries.length - 1;
  const actionHistoryItems = useMemo(
    () => actionHistoryEntries.map((entry, index) => ({ entry, index })).reverse(),
    [actionHistoryEntries]
  );

  useEffect(() => {
    setHistoryMode('actions');
    setActionHistoryEntries([]);
    setActiveActionHistoryIndex(-1);
    isApplyingActionHistoryRef.current = false;
    applyingActionHistorySignatureRef.current = null;
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

  useEffect(() => {
    const snapshot = buildActionHistorySnapshot();
    const signature = JSON.stringify(snapshot);

    if (isApplyingActionHistoryRef.current) {
      if (applyingActionHistorySignatureRef.current === signature) {
        isApplyingActionHistoryRef.current = false;
        applyingActionHistorySignatureRef.current = null;
      } else {
        // Fallback unlock in case restored state is normalized by other providers.
        isApplyingActionHistoryRef.current = false;
        applyingActionHistorySignatureRef.current = null;
      }
      return;
    }

    setActionHistoryEntries((prevEntries) => {
      const currentEntry = prevEntries[activeActionHistoryIndex];
      if (currentEntry?.signature === signature) return prevEntries;

      const previousSnapshot = currentEntry?.snapshot ?? null;
      const nextEntry: StudioActionHistoryEntry = {
        id: `action_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        label: resolveActionHistoryLabel(previousSnapshot, snapshot),
        createdAt: new Date().toISOString(),
        signature,
        snapshot,
      };

      const truncated = prevEntries.slice(0, activeActionHistoryIndex + 1);
      const appended = [...truncated, nextEntry];
      const trimmed = appended.slice(-ACTION_HISTORY_MAX_STEPS);
      setActiveActionHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
  }, [activeActionHistoryIndex, buildActionHistorySnapshot, resolveActionHistoryLabel]);

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

  const sequenceRequestPreview = useMemo((): SequenceRequestPreview => {
    const errors: string[] = [];
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      errors.push('Select a project first.');
    }
    if (!modelSupportsSequenceGeneration) {
      errors.push('Selected model does not support sequence generation.');
    }
    if (!workingSlot) {
      errors.push('Select a source card before running a sequence.');
    }
    if (!studioSettings.projectSequencing.enabled) {
      errors.push('Enable sequencing first.');
    }
    if (enabledSequenceRuntimeSteps.length === 0) {
      errors.push('Select at least one enabled sequence step.');
    }

    const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
    if (sequenceRequiresPrompt && !resolvedPrompt) {
      errors.push('Enter a prompt before running generation steps.');
    }
    const promptForSequence = (resolvedPrompt || promptText.trim()).trim();
    if (!promptForSequence) {
      errors.push('Sequence prompt is empty.');
    }

    const sourceSlotId = workingSlot?.id ?? '';
    if (!sourceSlotId.trim()) {
      errors.push('Source card id is missing.');
    }

    const sequencePolygons = collectSequenceMaskPolygons(maskShapes);
    const mask =
      sequencePolygons.length > 0
        ? {
          polygons: sequencePolygons,
          invert: maskInvert,
          feather: maskFeather,
        }
        : null;

    const images: RequestPreviewImage[] = [];
    const sourceImagePath = workingSlot?.imageFile?.filepath || workingSlot?.imageUrl || '';
    if (sourceImagePath) {
      images.push({
        kind: 'base',
        id: workingSlot?.id,
        name: workingSlot?.name || workingSlot?.id || 'Source card',
        filepath: sourceImagePath,
      });
    }
    const referenceSlots = compositeAssetIds
      .map((slotId: string) => slots.find((slot) => slot.id === slotId))
      .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));
    referenceSlots.forEach((slot) => {
      const filepath = slot.imageFile?.filepath || slot.imageUrl || '';
      if (!filepath) return;
      images.push({
        kind: 'reference',
        id: slot.id,
        name: slot.name || slot.id || 'Reference card',
        filepath,
      });
    });

    if (errors.length > 0) {
      return {
        payload: null,
        errors,
        resolvedPrompt: promptForSequence,
        maskShapeCount: sequencePolygons.length,
        images,
        stepCount: enabledSequenceRuntimeSteps.length,
      };
    }

    return {
      payload: {
        projectId: normalizedProjectId,
        sourceSlotId,
        prompt: promptForSequence,
        paramsState,
        referenceSlotIds: compositeAssetIds,
        mask,
        studioSettings: studioSettings as unknown as Record<string, unknown>,
        steps: enabledSequenceRuntimeSteps,
        metadata: {
          source: 'right-sidebar-sequence-generate',
        },
      },
      errors,
      resolvedPrompt: promptForSequence,
      maskShapeCount: sequencePolygons.length,
      images,
      stepCount: enabledSequenceRuntimeSteps.length,
    };
  }, [
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
    slots,
    studioSettings,
    workingSlot,
  ]);

  const sequenceRequestPreviewJson = useMemo(
    () =>
      sequenceRequestPreview.payload
        ? JSON.stringify(sequenceRequestPreview.payload, null, 2)
        : JSON.stringify(
          {
            errors: sequenceRequestPreview.errors,
          },
          null,
          2
        ),
    [sequenceRequestPreview]
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

  const handleRunSequenceGeneration = useCallback((): void => {
    if (sequenceRunBusy) return;

    if (!modelSupportsSequenceGeneration) {
      toast('Selected model does not support sequence generation.', { variant: 'info' });
      return;
    }

    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      toast('Select a project before running a sequence.', { variant: 'info' });
      return;
    }
    if (!workingSlot) {
      toast('Select a source card before running a sequence.', { variant: 'info' });
      return;
    }
    if (!studioSettings.projectSequencing.enabled) {
      toast('Enable sequencing first.', { variant: 'info' });
      setSidebarTab('sequencing');
      return;
    }
    if (enabledSequenceRuntimeSteps.length === 0) {
      toast('Select at least one enabled sequence step.', { variant: 'info' });
      setSidebarTab('sequencing');
      return;
    }

    const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
    if (sequenceRequiresPrompt && !resolvedPrompt) {
      toast('Enter a prompt before running generation steps.', { variant: 'info' });
      return;
    }

    const polygons = collectSequenceMaskPolygons(maskShapes);
    setSequenceRunBusy(true);
    void api.post<SequenceRunStartResponse>(
      '/api/image-studio/sequences/run',
      {
        projectId: normalizedProjectId,
        sourceSlotId: workingSlot.id,
        prompt: resolvedPrompt || promptText.trim(),
        paramsState,
        referenceSlotIds: compositeAssetIds,
        mask:
          polygons.length > 0
            ? {
              polygons,
              invert: maskInvert,
              feather: maskFeather,
            }
            : null,
        studioSettings: studioSettings as unknown as Record<string, unknown>,
        steps: enabledSequenceRuntimeSteps,
        metadata: {
          source: 'right-sidebar-sequence-generate',
        },
      }
    )
      .then((result) => {
        const stepCount =
          typeof result.stepCount === 'number' && Number.isFinite(result.stepCount)
            ? Math.max(1, Math.floor(result.stepCount))
            : Math.max(1, enabledSequenceRuntimeSteps.length);
        toast(`Sequence started (${stepCount} step${stepCount === 1 ? '' : 's'}).`, { variant: 'success' });
        if (result.dispatchMode === 'inline') {
          toast('Redis queue unavailable, sequence is running inline.', { variant: 'info' });
        }
        setPromptControlOpen(false);
        setSidebarTab('sequencing');
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : 'Failed to start sequence.', { variant: 'error' });
      })
      .finally(() => {
        setSequenceRunBusy(false);
      });
  }, [
    sequenceRunBusy,
    modelSupportsSequenceGeneration,
    projectId,
    workingSlot,
    studioSettings,
    enabledSequenceRuntimeSteps,
    promptText,
    paramsState,
    sequenceRequiresPrompt,
    maskShapes,
    compositeAssetIds,
    maskInvert,
    maskFeather,
    toast,
  ]);

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

      // Keep active project in sync (legacy key) for reload consistency.
      void updateSetting.mutateAsync({
        key: IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
        value: serializeImageStudioActiveProject(normalizedProjectId),
      }).catch(() => {});

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
