'use client';

import { useMemo } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type {
  RunStudioEnqueueResult,
  RunStudioPayload,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type { ImageStudioSettings } from '../../utils/studio-settings';
import { 
  PROMPT_ENGINE_SETTINGS_KEY, 
  parsePromptEngineSettings 
} from '@/shared/lib/prompt-engine/settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { 
  parseImageStudioFolderTree
} from '../../utils/studio-tree';
import { 
  IMAGE_STUDIO_UI_ACTIVE_KEY, 
  IMAGE_STUDIO_UI_PRESETS_KEY, 
  parseImageStudioUiPresets 
} from '../../utils/ui-presets';

interface UseDocsSnapshotsProps {
  projectId: string;
  projectsQuery: UseQueryResult<unknown[], Error>;
  projectSearch: string;
  slots: ImageStudioSlotRecord[];
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlot: ImageStudioSlotRecord | null;
  selectedFolder: string;
  virtualFolders: unknown[];
  previewMode: string;
  compositeAssets: unknown[];
  slotCreateOpen: boolean;
  driveImportOpen: boolean;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  promptText: string;
  paramsState: Record<string, unknown> | null;
  paramSpecs: Record<string, unknown> | null;
  paramUiOverrides: Record<string, unknown>;
  paramFlipMap: Record<string, boolean>;
  promptIssueCount: number;
  extractReviewOpen: boolean;
  extractDraftPrompt: string;
  extractResult: { ok: boolean } | null;
  tool: string;
  maskShapes: unknown[];
  visibleMaskShapeCount: number;
  closedMaskShapeCount: number;
  maskEligibleCount: number;
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  maskGenMode: string;
  maskGenLoading: boolean;
  maskThresholdSensitivity: number;
  maskEdgeSensitivity: number;
  runMutation: UseMutationResult<RunStudioEnqueueResult, Error, RunStudioPayload>;
  runOutputs: unknown[];
  generationHistory: unknown[];
  settingsLoaded: boolean;
  heavySettings: UseQueryResult<Map<string, string>, Error>;
  studioSettings: ImageStudioSettings;
  apiKeyConfigured: boolean;
  heavyMap: Map<string, string>;
  projectTreeKey: string | null;
}

export function useDocsSnapshots({
  projectId,
  projectsQuery,
  projectSearch,
  slots,
  selectedSlot,
  workingSlot,
  selectedFolder,
  virtualFolders,
  previewMode,
  compositeAssets,
  slotCreateOpen,
  driveImportOpen,
  slotInlineEditOpen,
  slotImageUrlDraft,
  slotBase64Draft,
  promptText,
  paramsState,
  paramSpecs,
  paramUiOverrides,
  paramFlipMap,
  promptIssueCount,
  extractReviewOpen,
  extractDraftPrompt,
  extractResult,
  tool,
  maskShapes,
  visibleMaskShapeCount,
  closedMaskShapeCount,
  maskEligibleCount,
  activeMaskId,
  selectedPointIndex,
  maskInvert,
  maskFeather,
  brushRadius,
  maskGenMode,
  maskGenLoading,
  maskThresholdSensitivity,
  maskEdgeSensitivity,
  runMutation,
  runOutputs,
  generationHistory,
  settingsLoaded,
  heavySettings,
  studioSettings,
  apiKeyConfigured,
  heavyMap,
  projectTreeKey,
}: UseDocsSnapshotsProps) {
  const uiPresets = useMemo(
    () => parseImageStudioUiPresets(heavyMap.get(IMAGE_STUDIO_UI_PRESETS_KEY)),
    [heavyMap]
  );
  const activeUiPresetId = useMemo(
    () => parseJsonSetting(heavyMap.get(IMAGE_STUDIO_UI_ACTIVE_KEY), null) ?? '',
    [heavyMap]
  );
  const activeUiPreset = useMemo(
    () => uiPresets.find((preset) => preset.id === activeUiPresetId) ?? null,
    [activeUiPresetId, uiPresets]
  );

  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(heavyMap.get(PROMPT_ENGINE_SETTINGS_KEY)),
    [heavyMap]
  );

  const validationRules = promptEngineSettings.promptValidation.rules ?? [];
  const learnedValidationRules = promptEngineSettings.promptValidation.learnedRules ?? [];
  const enabledValidationRuleCount = validationRules.filter((rule) => rule.enabled).length;
  const formatterRuleCount = validationRules.filter(
    (rule) => Boolean(rule.autofix?.enabled && (rule.autofix.operations?.length ?? 0) > 0)
  ).length;

  const persistedTree = useMemo(
    () => parseImageStudioFolderTree(projectTreeKey ? heavyMap.get(projectTreeKey) : null),
    [heavyMap, projectTreeKey]
  );

  const runtimeSnapshot = useMemo(
    () => ({
      project: {
        selectedProjectId: projectId || null,
        projectsLoaded: projectsQuery.data?.length ?? 0,
        projectsLoading: projectsQuery.isLoading,
        projectSearch,
      },
      slotState: {
        totalSlots: slots.length,
        selectedSlotId: selectedSlot?.id ?? null,
        selectedSlotName: selectedSlot?.name ?? null,
        workingSlotId: workingSlot?.id ?? null,
        workingSlotName: workingSlot?.name ?? null,
        selectedFolder: selectedFolder || null,
        virtualFolderCount: virtualFolders.length,
        previewMode,
        compositeAssetCount: compositeAssets.length,
        activeImageSource:
          workingSlot?.imageFile?.url ??
          workingSlot?.imageUrl ??
          (workingSlot?.imageBase64 ? 'inline-base64' : null),
        uiState: {
          slotCreateOpen,
          driveImportOpen,
          slotInlineEditOpen,
          slotImageUrlDraftLength: slotImageUrlDraft.trim().length,
          slotBase64DraftLength: slotBase64Draft.trim().length,
        },
      },
      promptState: {
        promptLength: promptText.length,
        paramsRootKeys: paramsState ? Object.keys(paramsState).length : 0,
        paramSpecCount: paramSpecs ? Object.keys(paramSpecs).length : 0,
        paramUiOverridesCount: Object.keys(paramUiOverrides).length,
        flippedParamsCount: Object.values(paramFlipMap).filter(Boolean).length,
        issueCount: promptIssueCount,
        extractReviewOpen,
        extractDraftPromptLength: extractDraftPrompt.length,
        extractResultOk: extractResult?.ok ?? null,
      },
      maskingState: {
        tool,
        shapeCount: maskShapes.length,
        visibleShapeCount: visibleMaskShapeCount,
        closedShapeCount: closedMaskShapeCount,
        eligiblePolygonOrLassoCount: maskEligibleCount,
        activeMaskId,
        selectedPointIndex,
        invert: maskInvert,
        feather: maskFeather,
        brushRadius,
        generationMode: maskGenMode,
        generationLoading: maskGenLoading,
        thresholdSensitivity: maskThresholdSensitivity,
        edgeSensitivity: maskEdgeSensitivity,
      },
      generationState: {
        runPending: runMutation.isPending,
        outputsCount: runOutputs.length,
        historyCount: generationHistory.length,
      },
    }),
    [
      activeMaskId,
      brushRadius,
      closedMaskShapeCount,
      compositeAssets.length,
      driveImportOpen,
      extractDraftPrompt.length,
      extractResult?.ok,
      extractReviewOpen,
      generationHistory.length,
      maskEdgeSensitivity,
      maskEligibleCount,
      maskFeather,
      maskGenLoading,
      maskGenMode,
      maskInvert,
      maskShapes.length,
      maskThresholdSensitivity,
      paramFlipMap,
      paramSpecs,
      paramUiOverrides,
      paramsState,
      previewMode,
      projectId,
      projectSearch,
      projectsQuery.data,
      projectsQuery.isLoading,
      promptIssueCount,
      promptText.length,
      runMutation.isPending,
      runOutputs.length,
      selectedFolder,
      selectedPointIndex,
      selectedSlot?.id,
      selectedSlot?.name,
      slotBase64Draft,
      slotCreateOpen,
      slotImageUrlDraft,
      slotInlineEditOpen,
      slots.length,
      tool,
      virtualFolders.length,
      visibleMaskShapeCount,
      workingSlot?.id,
      workingSlot?.imageBase64,
      workingSlot?.imageFile?.url,
      workingSlot?.imageUrl,
      workingSlot?.name,
    ]
  );

  const settingsSnapshot = useMemo(
    () => ({
      settingsLoaded,
      settingsQuery: {
        heavyLoading: heavySettings.isLoading,
        heavyFetching: heavySettings.isFetching,
        heavyError: heavySettings.error?.message ?? null,
      },
      studioSettings,
      openAiApiKeyConfigured: apiKeyConfigured,
      uiPresets: {
        count: uiPresets.length,
        activePresetId: activeUiPresetId || null,
        activePresetName: activeUiPreset?.name ?? null,
      },
      promptValidation: {
        enabled: promptEngineSettings.promptValidation.enabled,
        totalRules: validationRules.length,
        enabledRules: enabledValidationRuleCount,
        formatterRules: formatterRuleCount,
        learnedRules: learnedValidationRules.length,
      },
      persistedTree: {
        key: projectTreeKey,
        folders: persistedTree.folders,
        fileMapCount: Object.keys(persistedTree.fileMap).length,
      },
    }),
    [
      activeUiPreset?.name,
      activeUiPresetId,
      apiKeyConfigured,
      enabledValidationRuleCount,
      formatterRuleCount,
      heavySettings.error?.message,
      heavySettings.isFetching,
      heavySettings.isLoading,
      learnedValidationRules.length,
      persistedTree.fileMap,
      persistedTree.folders,
      projectTreeKey,
      promptEngineSettings.promptValidation.enabled,
      settingsLoaded,
      studioSettings,
      uiPresets.length,
      validationRules.length,
    ]
  );

  return {
    uiPresets,
    activeUiPresetId,
    activeUiPreset,
    promptEngineSettings,
    validationRules,
    learnedValidationRules,
    enabledValidationRuleCount,
    formatterRuleCount,
    persistedTree,
    runtimeSnapshot,
    settingsSnapshot,
  };
}
