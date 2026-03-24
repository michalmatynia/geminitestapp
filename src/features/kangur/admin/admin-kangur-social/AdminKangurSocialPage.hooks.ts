'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  trackKangurClientEvent,
  logKangurClientError,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { parseDatetimeLocal, mergeImageAssets } from './AdminKangurSocialPage.Constants';

import { useSocialSettings } from './hooks/useSocialSettings';
import { useSocialEditorSync } from './hooks/useSocialEditorSync';
import { useSocialPostCrud } from './hooks/useSocialPostCrud';
import { useSocialImageAddons } from './hooks/useSocialImageAddons';
import { useSocialContext } from './hooks/useSocialContext';
import { useSocialGeneration } from './hooks/useSocialGeneration';
import { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';
import type { ImageFileSelection } from '@/shared/contracts/files';

export function useAdminKangurSocialPage() {
  const settings = useSocialSettings();
  const brainRoutingModelId = settings.brainModelOptions.effectiveModelId || null;
  const visionRoutingModelId = settings.visionModelOptions.effectiveModelId || null;
  const resolvedBrainModelId = settings.brainModelId || brainRoutingModelId;
  const resolvedVisionModelId = settings.visionModelId || visionRoutingModelId;
  const canGenerateSocialDraft = Boolean(resolvedBrainModelId);
  const hasBatchCaptureConfig =
    Boolean(settings.batchCaptureBaseUrl.trim()) && settings.batchCapturePresetIds.length > 0;
  const effectiveBatchCapturePresetCount =
    settings.batchCapturePresetLimit == null
      ? settings.batchCapturePresetIds.length
      : Math.min(settings.batchCapturePresetLimit, settings.batchCapturePresetIds.length);
  const socialDraftBlockedReason = canGenerateSocialDraft
    ? null
    : 'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.';
  const socialBatchCaptureBlockedReason = hasBatchCaptureConfig
    ? null
    : !settings.batchCaptureBaseUrl.trim()
      ? 'Set a batch capture base URL in Social Settings first.'
      : 'Select at least one capture preset in Social Settings first.';
  const socialVisionWarning = resolvedVisionModelId
    ? null
    : 'Visual analysis is not configured. Choose a StudiQ Social vision model in Settings or assign AI Brain routing to enable screenshot analysis.';

  const editor = useSocialEditorSync({
    linkedinConnections: settings.linkedinConnections,
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
  });

  const buildSocialContext = useCallback((overrides?: Record<string, unknown>): Record<string, unknown> => ({
    postId: editor.activePost?.id ?? null,
    status: editor.activePost?.status ?? null,
    scheduledAt: parseDatetimeLocal(editor.scheduledAt),
    imageCount: editor.imageAssets.length,
    imageAddonCount: editor.imageAddonIds.length,
    docReferenceCount: editor.resolveDocReferences().length,
    visualDocUpdateCount: editor.activePost?.visualDocUpdates?.length ?? 0,
    notesLength: editor.generationNotes.trim().length,
    hasLinkedInConnection: Boolean(settings.linkedinConnectionId),
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
    brainModelOverrideId: settings.brainModelId,
    visionModelOverrideId: settings.visionModelId,
    brainRoutingModelId,
    visionRoutingModelId,
    modelSource:
      settings.brainModelId || settings.visionModelId ? 'social_settings' : 'ai_brain',
    batchCapturePresetCount: settings.batchCapturePresetIds.length,
    batchCaptureEffectivePresetCount: effectiveBatchCapturePresetCount,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl.trim() || null,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    ...overrides,
  }), [
    editor.activePost?.id,
    editor.activePost?.status,
    editor.activePost?.visualDocUpdates?.length,
    editor.imageAssets.length,
    editor.imageAddonIds.length,
    editor.resolveDocReferences,
    editor.scheduledAt,
    editor.generationNotes,
    settings.linkedinConnectionId,
    settings.batchCapturePresetIds.length,
    effectiveBatchCapturePresetCount,
    settings.batchCaptureBaseUrl,
    settings.batchCapturePresetLimit,
    settings.brainModelId,
    settings.visionModelId,
    brainRoutingModelId,
    resolvedBrainModelId,
    resolvedVisionModelId,
    visionRoutingModelId,
  ]);

  const crud = useSocialPostCrud({
    activePost: editor.activePost,
    activePostId: editor.activePostId,
    setActivePostId: editor.setActivePostId,
    editorState: editor.editorState,
    scheduledAt: editor.scheduledAt,
    imageAssets: editor.imageAssets,
    imageAddonIds: editor.imageAddonIds,
    resolveDocReferences: editor.resolveDocReferences,
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: settings.brainModelId,
    visionModelId: settings.visionModelId,
    buildSocialContext,
  });

  const imageAddons = useSocialImageAddons({
    addonForm: editor.addonForm,
    setAddonForm: editor.setAddonForm,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl,
    batchCapturePresetIds: settings.batchCapturePresetIds,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    buildSocialContext,
  });

  const context = useSocialContext({
    activePost: editor.activePost,
    resolveDocReferences: editor.resolveDocReferences,
    setContextSummary: editor.setContextSummary,
    buildSocialContext,
  });

  const generation = useSocialGeneration({
    activePost: editor.activePost,
    resolveDocReferences: editor.resolveDocReferences,
    generationNotes: editor.generationNotes,
    brainModelId: settings.brainModelId,
    visionModelId: settings.visionModelId,
    canGenerateDraft: canGenerateSocialDraft,
    generateDraftBlockedReason: socialDraftBlockedReason,
    imageAddonIds: editor.imageAddonIds,
    projectUrl: settings.projectUrl,
    buildSocialContext,
  });

  const pipeline = useSocialPipelineRunner({
    activePost: editor.activePost,
    activePostId: editor.activePostId,
    editorState: editor.editorState,
    imageAssets: editor.imageAssets,
    imageAddonIds: editor.imageAddonIds,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl,
    batchCapturePresetIds: settings.batchCapturePresetIds,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: settings.brainModelId,
    visionModelId: settings.visionModelId,
    canRunServerPipeline: canGenerateSocialDraft,
    pipelineBlockedReason: socialDraftBlockedReason,
    projectUrl: settings.projectUrl,
    generationNotes: editor.generationNotes,
    resolveDocReferences: editor.resolveDocReferences,
    buildSocialContext,
    handleLoadContext: context.handleLoadContext,
    setActivePostId: editor.setActivePostId,
    setEditorState: editor.setEditorState,
    setImageAddonIds: editor.setImageAddonIds,
    setImageAssets: editor.setImageAssets,
    setDocUpdatesResult: generation.setDocUpdatesResult,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleSelectAddons: editor.handleSelectAddons,
  });

  const [captureOnlyPending, setCaptureOnlyPending] = useState(false);
  const [captureOnlyMessage, setCaptureOnlyMessage] = useState<string | null>(null);
  const [captureOnlyErrorMessage, setCaptureOnlyErrorMessage] = useState<string | null>(null);

  const handleCaptureImagesOnly = useCallback(async (): Promise<void> => {
    if (!editor.activePost) {
      return;
    }
    if (!hasBatchCaptureConfig) {
      setCaptureOnlyMessage(null);
      setCaptureOnlyErrorMessage(socialBatchCaptureBlockedReason);
      return;
    }

    setCaptureOnlyPending(true);
    setCaptureOnlyErrorMessage(null);
    setCaptureOnlyMessage('Capturing fresh screenshots and linking them to the active draft...');

    try {
      const result = await imageAddons.runBatchCapture();
      const nextImageAddonIds = Array.from(
        new Set([...editor.imageAddonIds, ...result.addons.map((addon) => addon.id)])
      );
      const nextImageAssets = mergeImageAssets(
        editor.imageAssets,
        result.addons
          .map((addon) => addon.imageAsset)
          .filter((asset): asset is ImageFileSelection => Boolean(asset))
      );

      if (result.addons.length > 0) {
        const patched = await crud.patchMutation.mutateAsync({
          id: editor.activePost.id,
          updates: {
            imageAddonIds: nextImageAddonIds,
            imageAssets: nextImageAssets,
          },
        });

        editor.setImageAddonIds(patched.imageAddonIds ?? nextImageAddonIds);
        editor.setImageAssets(patched.imageAssets ?? nextImageAssets);
      }

      const usedPresetCount = result.usedPresetCount ?? effectiveBatchCapturePresetCount;
      setCaptureOnlyMessage(
        result.addons.length > 0
          ? `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${usedPresetCount} preset${usedPresetCount === 1 ? '' : 's'} and linked them to the draft.`
          : 'Capture finished with no new screenshots to attach.'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to capture screenshots.';
      setCaptureOnlyMessage(null);
      setCaptureOnlyErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'captureImagesOnly',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setCaptureOnlyPending(false);
    }
  }, [
    buildSocialContext,
    crud.patchMutation,
    editor.activePost,
    editor.imageAddonIds,
    editor.imageAssets,
    editor.setImageAddonIds,
    editor.setImageAssets,
    effectiveBatchCapturePresetCount,
    hasBatchCaptureConfig,
    imageAddons,
    socialBatchCaptureBlockedReason,
  ]);

  const handleRunFullPipeline = useCallback(async (): Promise<void> => {
    setCaptureOnlyMessage(null);
    setCaptureOnlyErrorMessage(null);
    await pipeline.handleRunFullPipeline();
  }, [pipeline.handleRunFullPipeline]);

  const handleRunFullPipelineWithFreshCapture = useCallback(async (): Promise<void> => {
    setCaptureOnlyMessage(null);
    setCaptureOnlyErrorMessage(null);
    await pipeline.handleRunFullPipelineWithFreshCapture();
  }, [pipeline.handleRunFullPipelineWithFreshCapture]);

  // Track model/connection changes via settings handlers with telemetry
  const handleBrainModelChange = useMemo(() => {
    const original = settings.handleBrainModelChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_model_select', {
        ...buildSocialContext({ nextModelId: value }),
      });
    };
  }, [settings.handleBrainModelChange, buildSocialContext]);

  const handleVisionModelChange = useMemo(() => {
    const original = settings.handleVisionModelChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_vision_model_select', {
        ...buildSocialContext({ nextVisionModelId: value }),
      });
    };
  }, [settings.handleVisionModelChange, buildSocialContext]);

  const handleLinkedInConnectionChange = useMemo(() => {
    const original = settings.handleLinkedInConnectionChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_connection_select', {
        ...buildSocialContext({ nextConnectionId: value }),
      });
    };
  }, [settings.handleLinkedInConnectionChange, buildSocialContext]);

  return {
    // Editor sync
    posts: editor.posts,
    recentAddons: editor.recentAddons,
    activePostId: editor.activePostId,
    setActivePostId: editor.setActivePostId,
    activePost: editor.activePost,
    editorState: editor.editorState,
    setEditorState: editor.setEditorState,
    scheduledAt: editor.scheduledAt,
    setScheduledAt: editor.setScheduledAt,
    docReferenceInput: editor.docReferenceInput,
    setDocReferenceInput: editor.setDocReferenceInput,
    generationNotes: editor.generationNotes,
    setGenerationNotes: editor.setGenerationNotes,
    imageAssets: editor.imageAssets,
    setImageAssets: editor.setImageAssets,
    imageAddonIds: editor.imageAddonIds,
    setImageAddonIds: editor.setImageAddonIds,
    addonForm: editor.addonForm,
    setAddonForm: editor.setAddonForm,
    showMediaLibrary: editor.showMediaLibrary,
    setShowMediaLibrary: editor.setShowMediaLibrary,
    resolveDocReferences: editor.resolveDocReferences,
    handleAddImages: editor.handleAddImages,
    handleRemoveImage: editor.handleRemoveImage,
    handleSelectAddon: editor.handleSelectAddon,
    handleRemoveAddon: editor.handleRemoveAddon,

    // Settings
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: settings.brainModelId,
    visionModelId: settings.visionModelId,
    canGenerateSocialDraft,
    socialDraftBlockedReason,
    hasBatchCaptureConfig,
    canRunFreshCapturePipeline: canGenerateSocialDraft && hasBatchCaptureConfig,
    socialBatchCaptureBlockedReason,
    socialVisionWarning,
    projectUrl: settings.projectUrl,
    setProjectUrl: settings.setProjectUrl,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl,
    setBatchCaptureBaseUrl: settings.setBatchCaptureBaseUrl,
    batchCapturePresetIds: settings.batchCapturePresetIds,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    setBatchCapturePresetLimit: settings.setBatchCapturePresetLimit,
    effectiveBatchCapturePresetCount,
    isSettingsDirty: settings.isSettingsDirty,
    isSavingSettings: settings.isSavingSettings,
    handleSaveSettings: settings.handleSaveSettings,
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
    handleToggleCapturePreset: settings.handleToggleCapturePreset,
    selectAllCapturePresets: settings.selectAllCapturePresets,
    clearCapturePresets: settings.clearCapturePresets,
    linkedinIntegration: settings.linkedinIntegration,
    linkedinConnections: settings.linkedinConnections,
    brainModelOptions: settings.brainModelOptions,
    visionModelOptions: settings.visionModelOptions,

    // CRUD
    saveMutation: crud.saveMutation,
    patchMutation: crud.patchMutation,
    deleteMutation: crud.deleteMutation,
    publishMutation: crud.publishMutation,
    unpublishMutation: crud.unpublishMutation,
    deleteError: crud.deleteError,
    clearDeleteError: crud.clearDeleteError,
    publishingPostId: crud.publishingPostId,
    unpublishingPostId: crud.unpublishingPostId,
    handleCreateDraft: crud.handleCreateDraft,
    handleDeletePost: crud.handleDeletePost,
    handleQuickPublishPost: crud.handleQuickPublishPost,
    handleUnpublishPost: crud.handleUnpublishPost,
    handleSave: crud.handleSave,
    handlePublish: crud.handlePublish,

    // Image addons
    createAddonMutation: imageAddons.createAddonMutation,
    batchCaptureMutation: imageAddons.batchCaptureMutation,
    batchCaptureResult: imageAddons.batchCaptureResult,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleCreateAddon: imageAddons.handleCreateAddon,
    handleBatchCapture: imageAddons.handleBatchCapture,

    // Context
    contextSummary: editor.contextSummary,
    contextLoading: context.contextLoading,
    handleLoadContext: context.handleLoadContext,

    // Generation
    generateMutation: generation.generateMutation,
    previewDocUpdatesMutation: generation.previewDocUpdatesMutation,
    applyDocUpdatesMutation: generation.applyDocUpdatesMutation,
    docUpdatesResult: generation.docUpdatesResult,
    setDocUpdatesResult: generation.setDocUpdatesResult,
    handleGenerate: generation.handleGenerate,
    handlePreviewDocUpdates: generation.handlePreviewDocUpdates,
    handleApplyDocUpdates: generation.handleApplyDocUpdates,

    // Pipeline
    pipelineStep: pipeline.pipelineStep,
    pipelineProgress: pipeline.pipelineProgress,
    pipelineErrorMessage: pipeline.pipelineErrorMessage,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    captureOnlyPending,
    captureOnlyMessage,
    captureOnlyErrorMessage,
    handleCaptureImagesOnly,

    // Queries (for isPending checks in consumer)
    postsQuery: editor.postsQuery,
    addonsQuery: editor.addonsQuery,
  };
}
