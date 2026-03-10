'use client';

import React, { useMemo, useState } from 'react';

import {
  IMAGE_STUDIO_CROP_DOC_KEYS,
  IMAGE_STUDIO_DOCS,
  IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS,
  IMAGE_STUDIO_SEQUENCE_DOC_KEYS,
  IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS,
} from '@/features/ai/image-studio/utils/studio-docs';
import { IMAGE_STUDIO_TREE_KEY_PREFIX } from '@/features/ai/image-studio/utils/studio-tree';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainProviderStatus } from '@/shared/lib/ai-brain/hooks/useBrainProviderStatus';
import { CopyButton, Input, FormSection, DocumentationList, Card, Hint } from '@/shared/ui';

import { useGenerationState } from '../context/GenerationContext';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsState } from '../context/SettingsContext';
import { useSlotsState } from '../context/SlotsContext';
import {
  DocsRuntimeStateSection,
  type DocsRuntimeState,
} from './docs/sections/DocsRuntimeStateSection';
import { useDocsSnapshots } from './docs/useDocsSnapshots';

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
  const promptExtractModel = useBrainAssignment({
    capability: 'image_studio.prompt_extract',
  });
  const uiExtractorModel = useBrainAssignment({
    capability: 'image_studio.ui_extractor',
  });
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });

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

  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const heavyMap = heavySettings.data ?? new Map<string, string>();

  const query = docsQuery.trim().toLowerCase();
  const includeByQuery = (parts: Array<string | number | boolean | null | undefined>): boolean => {
    if (!query) return true;
    return parts.some((part) =>
      String(part ?? '')
        .toLowerCase()
        .includes(query)
    );
  };

  const openAiProvider = useBrainProviderStatus('openai');
  const apiKeyConfigured = openAiProvider.configured;
  const openAiProviderStatus = openAiProvider.statusText;

  const projectTreeKey = useMemo(
    () => (projectId ? `${IMAGE_STUDIO_TREE_KEY_PREFIX}${sanitizeProjectId(projectId)}` : null),
    [projectId]
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

  const snapshots = useDocsSnapshots({
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
  });

  const {
    uiPresets,
    activeUiPresetId,
    activeUiPreset,
    validationRules,
    learnedValidationRules,
    enabledValidationRuleCount,
    formatterRuleCount,
    persistedTree,
    runtimeSnapshot,
    settingsSnapshot,
  } = snapshots;

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
        path: 'aiBrain.image_studio.prompt_extract',
        label: 'Prompt extraction Brain assignment',
        description: 'AI Brain capability used when extraction mode includes GPT.',
        value: promptExtractModel.effectiveModelId.trim() || 'Not configured in AI Brain',
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
        path: 'aiBrain.image_studio.ui_extractor',
        label: 'UI extractor Brain assignment',
        description: 'AI Brain capability used by AI UI extraction.',
        value: uiExtractorModel.effectiveModelId.trim() || 'Not configured in AI Brain',
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
        description:
          'Enables crop and object-layout control tooltips in Studio UI, sourced from Image Studio Docs.',
        value: metricValue(studioSettings.helpTooltips.cropButtonsEnabled),
      },
      {
        path: 'helpTooltips.sequencerFieldsEnabled',
        label: 'Sequencer field tooltips',
        description:
          'Enables sequencer field tooltips in Studio UI, sourced from Image Studio Docs.',
        value: metricValue(studioSettings.helpTooltips.sequencerFieldsEnabled),
      },
      {
        path: 'helpTooltips.versionGraphButtonsEnabled',
        label: 'Version graph button tooltips',
        description:
          'Enables Version Graph button tooltips in Studio UI, sourced from Image Studio Docs.',
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
        path: 'aiBrain.image_studio.general',
        label: 'Generation Brain assignment',
        description: 'AI Brain capability used for final image generation.',
        value: generationModel.effectiveModelId.trim() || 'Not configured in AI Brain',
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
        path: openAiProvider.settingsPath,
        label: 'Brain OpenAI provider key',
        description: 'Global OpenAI credential shared across Brain-routed features.',
        value: openAiProviderStatus,
      },
      {
        path: 'image_studio_ui_presets',
        label: 'UI presets',
        description: 'Saved UI param/prompt preset catalog for Studio.',
        value: `${uiPresets.length} preset(s)`,
      },
      {
        path: 'image_studio_ui_active_preset',
        label: 'Active UI preset',
        description: 'Preset automatically selected as active in Studio.',
        value: activeUiPreset?.name ?? activeUiPresetId ?? 'none',
      },
      {
        path: 'prompt_engine_settings',
        label: 'Prompt validation settings',
        description: 'Global validation/formatter rule set used by Image Studio validation.',
        value: `${enabledValidationRuleCount}/${validationRules.length} enabled, ${formatterRuleCount} formatter, ${learnedValidationRules.length} learned`,
      },
      {
        path: projectTreeKey ?? 'image_studio_folder_tree_{project}',
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
      openAiProviderStatus,
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
  const filteredCropControlDocs = IMAGE_STUDIO_CROP_DOC_KEYS.map(
    (key) => IMAGE_STUDIO_DOCS[key]
  ).filter((entry) =>
    includeByQuery(['crop', 'tooltips', entry.title, entry.description, entry.key])
  );
  const filteredSequenceFieldDocs = IMAGE_STUDIO_SEQUENCE_DOC_KEYS.map(
    (key) => IMAGE_STUDIO_DOCS[key]
  ).filter((entry) =>
    includeByQuery([
      'sequencer',
      'sequence',
      'field',
      'numeric',
      'tooltips',
      entry.title,
      entry.description,
      entry.key,
    ])
  );
  const filteredObjectLayoutDocs = IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS.map(
    (key) => IMAGE_STUDIO_DOCS[key]
  ).filter((entry) =>
    includeByQuery([
      'object layout',
      'center',
      'padding',
      'white background',
      'tooltips',
      entry.title,
      entry.description,
      entry.key,
    ])
  );
  const filteredVersionGraphDocs = IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS.map(
    (key) => IMAGE_STUDIO_DOCS[key]
  ).filter((entry) =>
    includeByQuery([
      'version graph',
      'graph',
      'toolbar',
      'filter',
      'inspector',
      'compare',
      'context menu',
      'tooltips',
      entry.title,
      entry.description,
      entry.key,
    ])
  );

  const noResults =
    query.length > 0 &&
    filteredSettingsRows.length === 0 &&
    filteredCropControlDocs.length === 0 &&
    filteredSequenceFieldDocs.length === 0 &&
    filteredObjectLayoutDocs.length === 0 &&
    filteredVersionGraphDocs.length === 0 &&
    !includeByQuery(['Image Studio Docs', 'runtime', 'snapshot', 'settings']);

  const runtimeState: DocsRuntimeState = {
    projectId,
    projectsQueryCount: projectsQuery.data?.length ?? 0,
    slotsLength: slots.length,
    selectedSlotName: selectedSlot?.name ?? selectedSlot?.id ?? 'none',
    workingSlotName: workingSlot?.name ?? workingSlot?.id ?? 'none',
    selectedFolder,
    previewMode,
    compositeAssetsLength: compositeAssets.length,
    promptTextLength: promptText.length,
    promptIssueCount,
    paramsStateCount: paramsState ? Object.keys(paramsState).length : 0,
    paramSpecsCount: paramSpecs ? Object.keys(paramSpecs).length : 0,
    maskShapesLength: maskShapes.length,
    maskEligibleCount,
    runPending: runMutation.isPending,
    runOutputsLength: runOutputs.length,
    generationHistoryLength: generationHistory.length,
    tool,
    activeMaskId,
    maskGenMode,
    maskGenLoading,
    maskInvert,
    maskFeather,
    brushRadius,
    maskThresholdSensitivity,
    maskEdgeSensitivity,
    projectSearch,
    virtualFoldersLength: virtualFolders.length,
    persistedTreeFoldersLength: persistedTree.folders.length,
    extractReviewOpen,
    extractDraftPromptLength: extractDraftPrompt.length,
    slotImageUrlDraftLength: slotImageUrlDraft.trim().length,
    slotBase64DraftLength: slotBase64Draft.trim().length,
  };

  return (
    <div className='space-y-4 text-sm text-gray-300'>
      <FormSection
        title='Image Studio Docs'
        description='Live documentation of the current Image Studio runtime state and every persisted setting used by generation, extraction, validation, presets, and folder-tree behavior.'
        className='p-5'
        actions={
          <Input
            size='sm'
            value={docsQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setDocsQuery(event.target.value)
            }
            placeholder='Search state, setting path, value...'
            className='h-9 w-full max-w-[360px] bg-card/70'
          />
        }
      />

      {includeByQuery(['runtime state', 'project', 'slot', 'prompt', 'mask', 'generation']) ? (
        <DocsRuntimeStateSection state={runtimeState} />
      ) : null}

      {filteredSettingsRows.length > 0 ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
          <h3 className='text-base font-semibold text-white'>Settings Reference</h3>
          <div className='grid gap-2'>
            {filteredSettingsRows.map((row) => (
              <Card
                key={row.path}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <Hint size='xxs' uppercase className='text-gray-500'>
                  {row.path}
                </Hint>
                <div className='mt-1 text-sm text-gray-100'>
                  {row.label}: {row.value}
                </div>
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
              <Card
                key={entry.key}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <Hint size='xxs' uppercase className='text-gray-500'>
                  crop.{entry.key}
                </Hint>
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
              <Card
                key={entry.key}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <Hint size='xxs' uppercase className='text-gray-500'>
                  sequence.{entry.key}
                </Hint>
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
              <Card
                key={entry.key}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <Hint size='xxs' uppercase className='text-gray-500'>
                  object_layout.{entry.key}
                </Hint>
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
              <Card
                key={entry.key}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <Hint size='xxs' uppercase className='text-gray-500'>
                  {entry.key}
                </Hint>
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
          <div className='text-sm text-gray-400'>
            No documentation sections match "{docsQuery}".
          </div>
        </Card>
      ) : null}

      {heavySettings.error ? (
        <Card variant='danger' padding='lg' className='space-y-1'>
          <div className='font-medium text-red-100'>Failed to load heavy settings snapshot</div>
          <div className='text-xs text-red-200/80'>{heavySettings.error.message}</div>
        </Card>
      ) : null}

      {includeByQuery(['docs coverage', 'what is included']) ? (
        <DocumentationList
          title='Docs Coverage'
          items={[
            'Live runtime state for projects, slots, prompt, masks, and generation.',
            <>
              All Image Studio settings from <code>image_studio_settings</code>.
            </>,
            'Crop, object layout, sequencer, and version graph tooltip copy sourced from the Image Studio docs index.',
            'API key status, UI preset state, prompt validation rule summary, and folder-tree persistence.',
            'Raw JSON snapshots so you can audit exactly what the application is currently using.',
          ]}
          listClassName='mt-2 text-sm'
        />
      ) : null}

      {slotsQuery.isLoading || projectsQuery.isLoading || heavySettings.isLoading ? (
        <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/40'>
          <div className='text-xs text-gray-500'>Refreshing live state…</div>
        </Card>
      ) : null}
    </div>
  );
}
