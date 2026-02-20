'use client';

import React, { useMemo, useState } from 'react';

import { PROMPT_ENGINE_SETTINGS_KEY, parsePromptEngineSettings } from '@/features/prompt-engine/settings';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { CopyButton, Input,  FormSection, MetadataItem, DocumentationSection, Card, Badge } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { useGenerationState } from '../context/GenerationContext';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsState } from '../context/SlotsContext';
import {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
} from '../utils/studio-docs';
import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '../utils/studio-settings';
import { IMAGE_STUDIO_TREE_KEY_PREFIX, parseImageStudioFolderTree } from '../utils/studio-tree';
import {
  IMAGE_STUDIO_UI_ACTIVE_KEY,
  IMAGE_STUDIO_UI_PRESETS_KEY,
  parseImageStudioUiPresets,
} from '../utils/ui-presets';

type SettingDocRow = {
  path: string;
  label: string;
  description: string;
  value: string;
};

function sanitizeProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function metricValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function ImageStudioDocsContent(): React.JSX.Element {
  const [docsQuery, setDocsQuery] = useState('');

  const { projectId, projectSearch, projectsQuery } = useProjectsState();
  const {
    slots,
    slotsQuery,
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
  } = useSlotsState();
  const { studioSettings, settingsLoaded } = useSettingsState();
  const {
    promptText,
    paramsState,
    paramSpecs,
    paramUiOverrides,
    paramFlipMap,
    issuesByPath,
    extractReviewOpen,
    extractDraftPrompt,
    extractResult,
  } = usePromptState();
  const {
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
    maskGenLoading,
    maskGenMode,
    maskThresholdSensitivity,
    maskEdgeSensitivity,
  } = useMaskingState();
  const { runOutputs, generationHistory, runMutation, maskEligibleCount } = useGenerationState();

  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const heavyMap = heavySettings.data ?? new Map<string, string>();

  const query = docsQuery.trim().toLowerCase();
  const includeByQuery = (parts: Array<string | number | boolean | null | undefined>): boolean => {
    if (!query) return true;
    return parts.some((part) => String(part ?? '').toLowerCase().includes(query));
  };

  const uiPresets = useMemo(
    () => parseImageStudioUiPresets(heavyMap.get(IMAGE_STUDIO_UI_PRESETS_KEY)),
    [heavyMap]
  );
  const activeUiPresetId = useMemo(
    () => parseJsonSetting<string | null>(heavyMap.get(IMAGE_STUDIO_UI_ACTIVE_KEY), null) ?? '',
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

  const apiKeyRaw =
    settingsStore.get(IMAGE_STUDIO_OPENAI_API_KEY_KEY) ?? settingsStore.get('openai_api_key') ?? '';
  const apiKeyConfigured = apiKeyRaw.trim().length > 0;

  const projectTreeKey = useMemo(
    () => (projectId ? `${IMAGE_STUDIO_TREE_KEY_PREFIX}${sanitizeProjectId(projectId)}` : null),
    [projectId]
  );
  const persistedTree = useMemo(
    () => parseImageStudioFolderTree(projectTreeKey ? heavyMap.get(projectTreeKey) : null),
    [heavyMap, projectTreeKey]
  );

  const visibleMaskShapeCount = useMemo(
    () => maskShapes.filter((shape) => shape.visible).length,
    [maskShapes]
  );
  const closedMaskShapeCount = useMemo(
    () => maskShapes.filter((shape) => shape.closed).length,
    [maskShapes]
  );
  const promptIssueCount = useMemo(
    () => Object.values(issuesByPath).reduce((count, issues) => count + issues.length, 0),
    [issuesByPath]
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

  const runtimeSnapshotJson = useMemo(
    () => JSON.stringify(runtimeSnapshot, null, 2),
    [runtimeSnapshot]
  );
  const settingsSnapshotJson = useMemo(
    () => JSON.stringify(settingsSnapshot, null, 2),
    [settingsSnapshot]
  );

  const settingsRows = useMemo<SettingDocRow[]>(
    () => [
      {
        path: 'promptExtraction.mode',
        label: 'Prompt extraction mode',
        description: 'Selects extraction strategy: programmatic, GPT, or hybrid fallback.',
        value: studioSettings.promptExtraction.mode,
      },
      {
        path: 'promptExtraction.applyAutofix',
        label: 'Apply formatter before extract',
        description: 'Runs formatter operations before extraction.',
        value: metricValue(studioSettings.promptExtraction.applyAutofix),
      },
      {
        path: 'promptExtraction.autoApplyFormattedPrompt',
        label: 'Auto-apply formatted prompt',
        description: 'Applies formatted prompt automatically after extraction.',
        value: metricValue(studioSettings.promptExtraction.autoApplyFormattedPrompt),
      },
      {
        path: 'promptExtraction.showValidationSummary',
        label: 'Show validation summary',
        description: 'Includes before/after validation summary in extraction feedback.',
        value: metricValue(studioSettings.promptExtraction.showValidationSummary),
      },
      {
        path: 'promptExtraction.gpt.model',
        label: 'Prompt extraction GPT model',
        description: 'Model used when extraction mode includes GPT.',
        value: studioSettings.promptExtraction.gpt.model,
      },
      {
        path: 'promptExtraction.gpt.temperature',
        label: 'Prompt extraction temperature',
        description: 'Temperature sent to extraction model.',
        value: metricValue(studioSettings.promptExtraction.gpt.temperature),
      },
      {
        path: 'promptExtraction.gpt.top_p',
        label: 'Prompt extraction top_p',
        description: 'Top-p sampling for extraction model.',
        value: metricValue(studioSettings.promptExtraction.gpt.top_p),
      },
      {
        path: 'promptExtraction.gpt.max_output_tokens',
        label: 'Prompt extraction max tokens',
        description: 'Max tokens for extraction response.',
        value: metricValue(studioSettings.promptExtraction.gpt.max_output_tokens),
      },
      {
        path: 'uiExtractor.mode',
        label: 'UI extractor mode',
        description: 'Controls extractor pipeline: heuristic, AI, or both.',
        value: studioSettings.uiExtractor.mode,
      },
      {
        path: 'uiExtractor.model',
        label: 'UI extractor model',
        description: 'Model used by AI UI extraction.',
        value: studioSettings.uiExtractor.model,
      },
      {
        path: 'uiExtractor.temperature',
        label: 'UI extractor temperature',
        description: 'Temperature for UI extractor model.',
        value: metricValue(studioSettings.uiExtractor.temperature),
      },
      {
        path: 'uiExtractor.max_output_tokens',
        label: 'UI extractor max tokens',
        description: 'Token budget for UI extraction output.',
        value: metricValue(studioSettings.uiExtractor.max_output_tokens),
      },
      {
        path: 'helpTooltips.cropButtonsEnabled',
        label: 'Crop/Object Layout button tooltips',
        description: 'Enables crop and object-layout control tooltips in Studio UI, sourced from Image Studio Docs.',
        value: metricValue(studioSettings.helpTooltips.cropButtonsEnabled),
      },
      {
        path: 'helpTooltips.sequencerFieldsEnabled',
        label: 'Sequencer field tooltips',
        description: 'Enables sequencer field tooltips in Studio UI, sourced from Image Studio Docs.',
        value: metricValue(studioSettings.helpTooltips.sequencerFieldsEnabled),
      },
      {
        path: 'helpTooltips.versionGraphButtonsEnabled',
        label: 'Version graph button tooltips',
        description: 'Enables Version Graph button tooltips in Studio UI, sourced from Image Studio Docs.',
        value: metricValue(studioSettings.helpTooltips.versionGraphButtonsEnabled),
      },
      {
        path: 'targetAi.provider',
        label: 'Target AI provider',
        description: 'Provider used for final image generation calls.',
        value: studioSettings.targetAi.provider,
      },
      {
        path: 'targetAi.openai.api',
        label: 'OpenAI API mode',
        description: 'Uses OpenAI responses or images endpoint.',
        value: studioSettings.targetAi.openai.api,
      },
      {
        path: 'targetAi.openai.model',
        label: 'OpenAI model',
        description: 'Primary model for generation in Studio.',
        value: studioSettings.targetAi.openai.model,
      },
      {
        path: 'targetAi.openai.temperature',
        label: 'OpenAI temperature',
        description: 'Generation temperature.',
        value: metricValue(studioSettings.targetAi.openai.temperature),
      },
      {
        path: 'targetAi.openai.top_p',
        label: 'OpenAI top_p',
        description: 'Generation top-p sampling.',
        value: metricValue(studioSettings.targetAi.openai.top_p),
      },
      {
        path: 'targetAi.openai.max_output_tokens',
        label: 'OpenAI max tokens',
        description: 'Maximum output tokens for responses API.',
        value: metricValue(studioSettings.targetAi.openai.max_output_tokens),
      },
      {
        path: 'targetAi.openai.presence_penalty',
        label: 'Presence penalty',
        description: 'Presence penalty parameter for responses API.',
        value: metricValue(studioSettings.targetAi.openai.presence_penalty),
      },
      {
        path: 'targetAi.openai.frequency_penalty',
        label: 'Frequency penalty',
        description: 'Frequency penalty parameter for responses API.',
        value: metricValue(studioSettings.targetAi.openai.frequency_penalty),
      },
      {
        path: 'targetAi.openai.seed',
        label: 'Seed',
        description: 'Optional deterministic seed.',
        value: metricValue(studioSettings.targetAi.openai.seed),
      },
      {
        path: 'targetAi.openai.user',
        label: 'OpenAI user',
        description: 'Optional user identifier attached to requests.',
        value: metricValue(studioSettings.targetAi.openai.user),
      },
      {
        path: 'targetAi.openai.stream',
        label: 'Streaming enabled',
        description: 'Controls streaming when available.',
        value: metricValue(studioSettings.targetAi.openai.stream),
      },
      {
        path: 'targetAi.openai.reasoning_effort',
        label: 'Reasoning effort',
        description: 'Reasoning effort for supported response models.',
        value: metricValue(studioSettings.targetAi.openai.reasoning_effort),
      },
      {
        path: 'targetAi.openai.response_format',
        label: 'Response format',
        description: 'Expected response payload format.',
        value: metricValue(studioSettings.targetAi.openai.response_format),
      },
      {
        path: 'targetAi.openai.tool_choice',
        label: 'Tool choice',
        description: 'Tool choice mode for responses API.',
        value: metricValue(studioSettings.targetAi.openai.tool_choice),
      },
      {
        path: 'targetAi.openai.image.size',
        label: 'Image size',
        description: 'Requested output image size.',
        value: metricValue(studioSettings.targetAi.openai.image.size),
      },
      {
        path: 'targetAi.openai.image.quality',
        label: 'Image quality',
        description: 'Requested output quality mode.',
        value: metricValue(studioSettings.targetAi.openai.image.quality),
      },
      {
        path: 'targetAi.openai.image.background',
        label: 'Image background',
        description: 'Requested image background mode.',
        value: metricValue(studioSettings.targetAi.openai.image.background),
      },
      {
        path: 'targetAi.openai.image.format',
        label: 'Image format',
        description: 'Requested image file format.',
        value: metricValue(studioSettings.targetAi.openai.image.format),
      },
      {
        path: 'targetAi.openai.image.n',
        label: 'Image variants per run',
        description: 'How many outputs are requested per generation.',
        value: metricValue(studioSettings.targetAi.openai.image.n),
      },
      {
        path: 'targetAi.openai.image.moderation',
        label: 'Image moderation',
        description: 'Moderation level sent with image generation requests.',
        value: metricValue(studioSettings.targetAi.openai.image.moderation),
      },
      {
        path: 'targetAi.openai.image.output_compression',
        label: 'Image output compression',
        description: 'Compression level for jpeg/webp output formats.',
        value: metricValue(studioSettings.targetAi.openai.image.output_compression),
      },
      {
        path: 'targetAi.openai.image.partial_images',
        label: 'Image partial outputs',
        description: 'Partial image count requested when streaming is enabled.',
        value: metricValue(studioSettings.targetAi.openai.image.partial_images),
      },
      {
        path: 'targetAi.openai.advanced_overrides',
        label: 'Advanced overrides',
        description: 'Raw provider payload overrides.',
        value: studioSettings.targetAi.openai.advanced_overrides
          ? `${Object.keys(studioSettings.targetAi.openai.advanced_overrides).length} key(s)`
          : 'null',
      },
      {
        path: IMAGE_STUDIO_OPENAI_API_KEY_KEY,
        label: 'Image Studio API key',
        description: 'Secret key used by generation, extraction and AI mask features.',
        value: apiKeyConfigured ? 'configured' : 'missing',
      },
      {
        path: IMAGE_STUDIO_UI_PRESETS_KEY,
        label: 'UI presets',
        description: 'Saved UI param/prompt preset catalog for Studio.',
        value: `${uiPresets.length} preset(s)`,
      },
      {
        path: IMAGE_STUDIO_UI_ACTIVE_KEY,
        label: 'Active UI preset',
        description: 'Preset automatically selected as active in Studio.',
        value: activeUiPreset?.name ?? activeUiPresetId ?? 'none',
      },
      {
        path: PROMPT_ENGINE_SETTINGS_KEY,
        label: 'Prompt validation settings',
        description: 'Global validation/formatter rule set used by Image Studio validation.',
        value: `${enabledValidationRuleCount}/${validationRules.length} enabled, ${formatterRuleCount} formatter, ${learnedValidationRules.length} learned`,
      },
      {
        path: projectTreeKey ?? `${IMAGE_STUDIO_TREE_KEY_PREFIX}{project}`,
        label: 'Folder tree state key',
        description: 'Per-project persisted folder tree and file-map state.',
        value: `${persistedTree.folders.length} folders, ${Object.keys(persistedTree.fileMap).length} mapped file(s)`,
      },
    ],
    [
      activeUiPreset?.name,
      activeUiPresetId,
      apiKeyConfigured,
      enabledValidationRuleCount,
      formatterRuleCount,
      learnedValidationRules.length,
      persistedTree.fileMap,
      persistedTree.folders.length,
      projectTreeKey,
      studioSettings,
      uiPresets.length,
      validationRules.length,
    ]
  );

  const filteredSettingsRows = settingsRows.filter((row) =>
    includeByQuery([row.path, row.label, row.description, row.value])
  );
  const filteredCropControlDocs = IMAGE_STUDIO_CROP_DOC_KEYS
    .map((key) => IMAGE_STUDIO_DOCS[key])
    .filter((entry) =>
      includeByQuery(['crop', 'tooltips', entry.title, entry.description, entry.key])
    );
  const filteredSequenceFieldDocs = IMAGE_STUDIO_SEQUENCE_DOC_KEYS
    .map((key) => IMAGE_STUDIO_DOCS[key])
    .filter((entry) =>
      includeByQuery(['sequencer', 'sequence', 'field', 'numeric', 'tooltips', entry.title, entry.description, entry.key])
    );
  const filteredObjectLayoutDocs = IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS
    .map((key) => IMAGE_STUDIO_DOCS[key])
    .filter((entry) =>
      includeByQuery(['object layout', 'center', 'padding', 'white background', 'tooltips', entry.title, entry.description, entry.key])
    );
  const filteredVersionGraphDocs = IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS
    .map((key) => IMAGE_STUDIO_DOCS[key])
    .filter((entry) =>
      includeByQuery(['version graph', 'graph', 'toolbar', 'filter', 'inspector', 'compare', 'context menu', 'tooltips', entry.title, entry.description, entry.key])
    );

  const noResults =
    query.length > 0 &&
    filteredSettingsRows.length === 0 &&
    filteredCropControlDocs.length === 0 &&
    filteredSequenceFieldDocs.length === 0 &&
    filteredObjectLayoutDocs.length === 0 &&
    filteredVersionGraphDocs.length === 0 &&
    !includeByQuery(['Image Studio Docs', 'runtime', 'snapshot', 'settings']);

  return (
    <div className='space-y-4 text-sm text-gray-300'>
      <FormSection
        title='Image Studio Docs'
        description='Live documentation of the current Image Studio runtime state and every persisted setting used by generation, extraction, validation, presets, and folder-tree behavior.'
        className='p-5'
        actions={(
          <Input size='sm'
            value={docsQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDocsQuery(event.target.value)}
            placeholder='Search state, setting path, value...'
            className='h-9 w-full max-w-[360px] bg-card/70'
          />
        )}
      />

      {includeByQuery(['runtime state', 'project', 'slot', 'prompt', 'mask', 'generation']) ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Current Runtime State</h3>
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <MetadataItem label='Project' value={projectId || 'none'} hint={`${projectsQuery.data?.length ?? 0} total`} />
            <MetadataItem label='Slots' value={String(slots.length)} hint={`selected: ${selectedSlot?.name ?? selectedSlot?.id ?? 'none'}`} />
            <MetadataItem label='Working Slot' value={workingSlot?.name ?? workingSlot?.id ?? 'none'} hint={`folder: ${selectedFolder || 'root'}`} />
            <MetadataItem label='Preview Mode' value={previewMode} hint={`composite: ${compositeAssets.length}`} />
            <MetadataItem label='Prompt Length' value={String(promptText.length)} hint={`${promptIssueCount} validation issue(s)`} />
            <MetadataItem label='Params' value={String(paramsState ? Object.keys(paramsState).length : 0)} hint={`specs: ${paramSpecs ? Object.keys(paramSpecs).length : 0}`} />
            <MetadataItem label='Mask Shapes' value={String(maskShapes.length)} hint={`${maskEligibleCount} eligible polygon/lasso`} />
            <MetadataItem label='Generation' value={runMutation.isPending ? 'running' : 'idle'} hint={`${runOutputs.length} output(s), ${generationHistory.length} history`} />
          </div>
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <MetadataItem label='Mask Tool' value={tool} hint={`active mask: ${activeMaskId ?? 'none'}`} />
            <MetadataItem label='Mask Mode' value={maskGenMode} hint={`loading: ${metricValue(maskGenLoading)}`} />
            <MetadataItem label='Mask Controls' value={`invert=${metricValue(maskInvert)}`} hint={`feather=${maskFeather}, brush=${brushRadius}`} />
            <MetadataItem label='Detection' value={`threshold=${maskThresholdSensitivity}`} hint={`edges=${maskEdgeSensitivity}`} />
          </div>
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <MetadataItem label='Project Search' value={projectSearch || '(empty)'} />
            <MetadataItem label='Virtual Folders' value={String(virtualFolders.length)} hint={`persisted: ${persistedTree.folders.length}`} />
            <MetadataItem label='Extraction Review' value={metricValue(extractReviewOpen)} hint={`draft length: ${extractDraftPrompt.length}`} />
            <MetadataItem label='Slot UI Drafts' value={`url=${slotImageUrlDraft.trim().length}`} hint={`base64=${slotBase64Draft.trim().length}`} />
          </div>
        </Card>
      ) : null}

      {filteredSettingsRows.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Settings Reference</h3>
          <div className='grid gap-2'>
            {filteredSettingsRows.map((row) => (
              <Card key={row.path} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>{row.path}</div>
                <div className='mt-1 text-sm text-gray-100'>{row.label}: {row.value}</div>
                <div className='mt-1 text-xs text-gray-400'>{row.description}</div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {filteredCropControlDocs.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Crop Controls Reference</h3>
          <div className='grid gap-2'>
            {filteredCropControlDocs.map((entry) => (
              <Card key={entry.key} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>crop.{entry.key}</div>
                <div className='mt-1 text-sm text-gray-100'>{entry.title}</div>
                <div className='mt-1 text-xs text-gray-400'>{entry.description}</div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {filteredSequenceFieldDocs.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Sequencer Field Reference</h3>
          <div className='grid gap-2'>
            {filteredSequenceFieldDocs.map((entry) => (
              <Card key={entry.key} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>sequence.{entry.key}</div>
                <div className='mt-1 text-sm text-gray-100'>{entry.title}</div>
                <div className='mt-1 text-xs text-gray-400'>{entry.description}</div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {filteredObjectLayoutDocs.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Object Layout Controls Reference</h3>
          <div className='grid gap-2'>
            {filteredObjectLayoutDocs.map((entry) => (
              <Card key={entry.key} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>object_layout.{entry.key}</div>
                <div className='mt-1 text-sm text-gray-100'>{entry.title}</div>
                <div className='mt-1 text-xs text-gray-400'>{entry.description}</div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {filteredVersionGraphDocs.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Version Graph Controls Reference</h3>
          <div className='grid gap-2'>
            {filteredVersionGraphDocs.map((entry) => (
              <Card key={entry.key} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>{entry.key}</div>
                <div className='mt-1 text-sm text-gray-100'>{entry.title}</div>
                <div className='mt-1 text-xs text-gray-400'>{entry.description}</div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {includeByQuery(['runtime snapshot', 'json', 'state']) ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-base font-semibold text-white'>Runtime Snapshot JSON</h3>
            <CopyButton value={runtimeSnapshotJson} variant='outline' size='sm' showText />
          </div>
          <pre className='max-h-[360px] overflow-auto rounded-md border border-border/60 bg-black/30 p-3 text-xs text-gray-200'>
            {runtimeSnapshotJson}
          </pre>
        </Card>
      ) : null}

      {includeByQuery(['settings snapshot', 'json', 'config']) ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-base font-semibold text-white'>Settings Snapshot JSON</h3>
            <CopyButton value={settingsSnapshotJson} variant='outline' size='sm' showText />
          </div>
          <pre className='max-h-[420px] overflow-auto rounded-md border border-border/60 bg-black/30 p-3 text-xs text-gray-200'>
            {settingsSnapshotJson}
          </pre>
        </Card>
      ) : null}

      {noResults ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
          <div className='text-sm text-gray-400'>No documentation sections match "{docsQuery}".</div>
        </Card>
      ) : null}

      {heavySettings.error ? (
        <Card variant='danger' padding='lg' className='space-y-1'>
          <div className='font-medium text-red-100'>Failed to load heavy settings snapshot</div>
          <div className='text-xs text-red-200/80'>{heavySettings.error.message}</div>
        </Card>
      ) : null}

      {includeByQuery(['docs coverage', 'what is included']) ? (
        <DocumentationSection title='Docs Coverage'>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm'>
            <li>Live runtime state for projects, slots, prompt, masks, and generation.</li>
            <li>All Image Studio settings from <code>image_studio_settings</code>.</li>
            <li>Crop, object layout, sequencer, and version graph tooltip copy sourced from the Image Studio docs index.</li>
            <li>API key status, UI preset state, prompt validation rule summary, and folder-tree persistence.</li>
            <li>Raw JSON snapshots so you can audit exactly what the application is currently using.</li>
          </ul>
        </DocumentationSection>
      ) : null}

      {slotsQuery.isLoading || projectsQuery.isLoading || heavySettings.isLoading ? (
        <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/40'>
          <div className='text-xs text-gray-500'>Refreshing live state…</div>
        </Card>
      ) : null}
    </div>
  );
}
