'use client';

import { Clock3, Eye, GitBranch, Loader2, Play, Redo2, SlidersHorizontal, Sparkles, Undo2, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  VectorDrawingToolbar,
} from '@/features/vector-drawing';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  AppModal,
  Label,
  MultiSelect,
  Textarea,
  SelectSimple,
  ValidatorFormatterToggle,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { GenerationToolbar } from './GenerationToolbar';
import { LabeledSlider } from './LabeledSlider';
import { ParamRow } from './ParamRow';
import { ProjectGenerationHistoryTab } from './ProjectGenerationHistoryTab';
import { RightSidebarProvider } from './RightSidebarContext';
import { SequencingPanel } from './SequencingPanel';
import { StudioCard } from './StudioCard';
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
import { normalizeImageStudioModelPresets, resolveImageStudioSequenceActiveSteps } from '../utils/studio-settings';

import type { ParamUiControl } from '../utils/param-ui';

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

type StudioActionHistorySnapshot = {
  selectedFolder: string;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: 'image' | '3d';
  compositeAssetIds: string[];
  tool: VectorToolMode;
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
  const { isFocusMode, validatorEnabled, formatterEnabled } = useUiState();
  const { setValidatorEnabled, setFormatterEnabled } = useUiActions();
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
  const [promptControlOpen, setPromptControlOpen] = useState(false);
  const [promptSaveBusy, setPromptSaveBusy] = useState(false);
  const [sequenceRunBusy, setSequenceRunBusy] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'graph' | 'sequencing' | 'history'>('controls');
  const [historyMode, setHistoryMode] = useState<'actions' | 'runs'>('actions');
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

  const buildActionHistorySnapshot = useCallback((): StudioActionHistorySnapshot => ({
    selectedFolder,
    selectedSlotId,
    workingSlotId,
    previewMode,
    compositeAssetIds: cloneSerializableValue(compositeAssetIds),
    tool,
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

  const requestPreviewJson = useMemo(
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
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-4'>
        <Button
          type='button'
          onClick={handleSavePromptToProject}
          disabled={promptSaveBusy || !projectId.trim()}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          {promptSaveBusy ? 'Saving...' : 'Save'}
        </Button>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>Control Prompt</h2>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          size='xs'
          type='button'
          variant='outline'
          title='Open Prompt Exploder with current prompt'
          aria-label='Open Prompt Exploder with current prompt'
          disabled={!promptText.trim()}
          onClick={() => {
            setPromptControlOpen(false);
            handleOpenPromptExploder();
          }}
        >
          Prompt Exploder
        </Button>
        <Button
          type='button'
          onClick={() => setPromptControlOpen(false)}
          className='min-w-[100px] border border-white/20 hover:border-white/40'
        >
          Close
        </Button>
      </div>
    </div>
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
            <div className='min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-3'>
              <div className='mb-3 grid grid-cols-2 gap-2'>
                <Button
                  size='xs'
                  type='button'
                  variant='ghost'
                  className={cn(
                    'h-7 rounded border border-border/60 px-2 text-[11px]',
                    historyMode === 'actions'
                      ? 'border-blue-400/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/10'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                  onClick={() => setHistoryMode('actions')}
                >
                  Action Steps
                </Button>
                <Button
                  size='xs'
                  type='button'
                  variant='ghost'
                  className={cn(
                    'h-7 rounded border border-border/60 px-2 text-[11px]',
                    historyMode === 'runs'
                      ? 'border-blue-400/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/10'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                  onClick={() => setHistoryMode('runs')}
                >
                  Generation Runs
                </Button>
              </div>
              {historyMode === 'actions' ? (
                <div className='min-h-0 flex-1 overflow-y-auto'>
                  <div className='mb-2 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
                    Tracks editor state changes (up to {ACTION_HISTORY_MAX_STEPS} steps). Click any step to restore it.
                  </div>
                  {actionHistoryItems.length > 0 ? (
                    <div className='space-y-2'>
                      {actionHistoryItems.map(({ entry, index }) => {
                        const isActiveStep = index === activeActionHistoryIndex;
                        return (
                          <button
                            key={entry.id}
                            type='button'
                            onClick={() => handleRestoreActionStep(index)}
                            className={cn(
                              'w-full rounded border px-2 py-2 text-left transition-colors',
                              isActiveStep
                                ? 'border-blue-400/70 bg-blue-500/10'
                                : 'border-border/60 bg-card/30 hover:border-border/80 hover:bg-card/50'
                            )}
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <span className={cn('text-xs', isActiveStep ? 'text-blue-100' : 'text-gray-200')}>
                                {entry.label}
                              </span>
                              <span className='text-[10px] text-gray-500'>
                                {new Date(entry.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className='mt-1 text-[10px] text-gray-500'>
                              Step {index + 1} of {actionHistoryEntries.length}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-500'>
                      No editor actions recorded yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className='min-h-0 flex-1 overflow-y-auto'>
                  <ProjectGenerationHistoryTab />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className='space-y-2 px-4 py-2'>
                <div className='rounded border border-border/60 bg-card/30 p-2'>
                  <div className='space-y-2'>
                    <SelectSimple size='sm'
                      value={studioSettings.targetAi.openai.model}
                      onValueChange={(value: string) => {
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
                      options={quickModelOptions}
                      placeholder='Select model'
                      triggerClassName='h-8 text-xs'
                      ariaLabel='Quick generation model'
                    />
                    <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
                      <Button size='xs'
                        onClick={handleRunGeneration}
                        disabled={!promptText.trim() || generationBusy || sequenceRunBusy}
                        className='sm:min-w-[140px]'
                      >
                        {generationBusy ? (
                          <Loader2 className='mr-2 size-4 animate-spin' />
                        ) : (
                          <Play className='mr-2 size-4' />
                        )}
                        {generationLabel}
                      </Button>
                      {modelSupportsSequenceGeneration ? (
                        <Button size='xs'
                          variant='outline'
                          onClick={handleRunSequenceGeneration}
                          disabled={generationBusy || sequenceRunBusy}
                          className='sm:min-w-[160px]'
                          title='Run enabled sequence steps in sequencer'
                          aria-label='Generate sequence'
                        >
                          {sequenceRunBusy ? (
                            <Loader2 className='mr-2 size-4 animate-spin' />
                          ) : (
                            <Workflow className='mr-2 size-4' />
                          )}
                          {sequenceRunBusy ? 'Starting...' : 'Generate Sequence'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
                    <span className='text-gray-300'>
                    Tokens ~{estimatedPromptTokens.toLocaleString()}
                    </span>
                    <span
                      className='max-w-full truncate text-gray-300'
                      title={`Estimated generation cost for ${selectedModelId}`}
                    >
                    Est. Cost ({selectedModelId}) ${estimatedGenerationCost.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className='flex flex-wrap items-center justify-end gap-2'>
                  <Button size='xs'
                    variant='outline'
                    title='Open prompt controls'
                    aria-label='Open prompt controls'
                    onClick={() => setPromptControlOpen(true)}
                  >
                    <Sparkles className='mr-2 size-4' />
            Control Prompt
                  </Button>
                  <Button size='xs'
                    variant='outline'
                    title='Preview generation request payload and input images'
                    aria-label='Preview generation request payload and input images'
                    onClick={() => setRequestPreviewOpen(true)}
                  >
                    <Eye className='mr-2 size-4' />
            Preview Request
                  </Button>
                  <Button size='xs'
                    variant='outline'
                    title={hasExtractedControls ? 'Open extracted controls' : 'Extract controls first'}
                    aria-label='Open extracted controls'
                    disabled={!hasExtractedControls}
                    onClick={() => setControlsOpen(true)}
                  >
                    <SlidersHorizontal className='mr-2 size-4' />
              Controls
                  </Button>
                </div>

              </div>
              <div className='relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-0'>
                <StudioCard label='Tools' className='shrink-0'>
                  <div className='space-y-3'>
                    <div className='rounded border border-border/60 bg-card/30 p-3'>
                      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Shape Tools</div>
                      <VectorDrawingToolbar
                        tool={tool}
                        onSelectTool={setTool}
                        onClear={handleClearAllShapes}
                        disableClear={maskShapes.length === 0}
                        className='w-full flex-wrap justify-start rounded-xl border-border/60 bg-card/40'
                      />
                      {tool !== 'select' ? (
                        <div className='mt-3 rounded border border-border/60 bg-card/30 p-3'>
                          <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
                            <LabeledSlider
                              label='Mask Feather'
                              value={maskFeather}
                              onChange={setMaskFeather}
                            />
                            {tool === 'brush' ? (
                              <LabeledSlider
                                label='Brush Radius'
                                value={brushRadius}
                                onChange={setBrushRadius}
                                min={1}
                                max={64}
                                fallbackValue={8}
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className='mt-2 text-[11px] text-gray-500'>
                          Select a drawing tool to see contextual settings.
                        </div>
                      )}
                    </div>

                    <div className='rounded border border-border/60 bg-card/30 p-3'>
                      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>
                        Image Operations
                      </div>
                      <GenerationToolbar />
                    </div>

                    <div className='rounded border border-border/60 bg-card/30 p-3'>
                      <div className='mb-2 text-[10px] uppercase tracking-wide text-gray-500'>Masking Tools</div>
                      <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-2'>
                        <LabeledSlider
                          label='Threshold Sensitivity'
                          value={maskThresholdSensitivity}
                          onChange={setMaskThresholdSensitivity}
                          fallbackValue={55}
                          disabled={!workingSlot}
                        />
                        <LabeledSlider
                          label='Edge Sensitivity'
                          value={maskEdgeSensitivity}
                          onChange={setMaskEdgeSensitivity}
                          fallbackValue={55}
                          disabled={!workingSlot}
                        />
                      </div>
                    </div>
                  </div>
                </StudioCard>

                <StudioCard label='Composite References'>
                  <MultiSelect
                    options={compositeAssetOptions}
                    selected={compositeAssetIds}
                    onChange={setCompositeAssetIds}
                    placeholder='Select additional reference cards'
                    searchPlaceholder='Search cards...'
                    emptyMessage='No cards available.'
                    className='w-full'
                  />
                  <div className='text-[10px] text-gray-500'>
            Selected references are sent with the base image for multi-image generation.
                  </div>
                </StudioCard>

              </div>
            </>
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
        <div className='space-y-4 text-xs text-gray-200'>
          <div className='rounded border border-border/60 bg-card/40 p-3 text-[11px] text-gray-300'>
            This is the exact payload enqueued to <span className='text-gray-100'>`/api/image-studio/run`</span> before Redis runtime processing.
          </div>
          <div className='text-[11px] text-gray-400'>
            Resolved prompt length: <span className='text-gray-200'>{requestPreview.resolvedPrompt.length}</span> ·
            mask shapes in payload: <span className='text-gray-200'>{requestPreview.maskShapeCount}</span>
          </div>

          {requestPreview.errors.length > 0 ? (
            <div className='rounded border border-red-400/40 bg-red-500/10 p-3 text-[11px] text-red-200'>
              {requestPreview.errors.join(' ')}
            </div>
          ) : null}

          <div className='space-y-2'>
            <div className='text-[11px] text-gray-400'>
              Input Images ({requestPreview.images.length})
            </div>
            {requestPreview.images.length > 0 ? (
              <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                {requestPreview.images.map((image) => (
                  <div key={`${image.kind}:${image.id ?? image.filepath}`} className='rounded border border-border/60 bg-card/30 p-2'>
                    <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>
                      {image.kind === 'base' ? 'Base' : 'Reference'}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.filepath}
                      alt={image.name}
                      className='h-28 w-full rounded object-cover'
                    />
                    <div className='mt-1 truncate text-[11px] text-gray-200'>{image.name}</div>
                    <div className='truncate text-[10px] text-gray-500'>{image.filepath}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-[11px] text-gray-500'>No request images are available yet.</div>
            )}
          </div>

          <div className='space-y-2'>
            <div className='text-[11px] text-gray-400'>Payload JSON</div>
            <pre className='max-h-[50vh] overflow-auto rounded border border-border/60 bg-black/30 p-3 font-mono text-[11px] text-gray-100 whitespace-pre-wrap'>
              {requestPreviewJson}
            </pre>
          </div>
        </div>
      </AppModal>
    </>
  );
}
