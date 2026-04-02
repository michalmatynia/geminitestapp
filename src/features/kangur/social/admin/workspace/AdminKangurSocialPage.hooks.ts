'use client';

import { useCallback } from 'react';

import { useSocialSettings } from './hooks/useSocialSettings';
import { useSocialEditorSync } from './hooks/useSocialEditorSync';
import { useSocialPostCrud } from './hooks/useSocialPostCrud';
import { useSocialImageAddons } from './hooks/useSocialImageAddons';
import { useSocialContext } from './hooks/useSocialContext';
import { useSocialGeneration } from './hooks/useSocialGeneration';
import { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';
import { useSocialMissingImageAddons } from './hooks/useSocialMissingImageAddons';
import { useSocialCaptureFlows } from './hooks/useSocialCaptureFlows';
import { useSocialModelTelemetry } from './hooks/useSocialModelTelemetry';
import { KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT } from '@/features/kangur/social/shared/social-playwright-capture';
import { parseDatetimeLocal } from './AdminKangurSocialPage.Constants';

export function useAdminKangurSocialPage() {
  const settings = useSocialSettings();
  const brainRoutingModelId = settings.brainModelOptions.effectiveModelId || null;
  const visionRoutingModelId = settings.visionModelOptions.effectiveModelId || null;
  const resolvedBrainModelId = settings.brainModelId || brainRoutingModelId;
  const resolvedVisionModelId = settings.visionModelId || visionRoutingModelId;
  const hasGenerationModel = Boolean(resolvedBrainModelId);
  const canGenerateSocialDraft =
    hasGenerationModel && !settings.projectUrlError;
  const hasBatchCaptureConfig =
    Boolean(settings.batchCaptureBaseUrl.trim()) && settings.batchCapturePresetIds.length > 0;
  const effectiveBatchCapturePresetCount =
    settings.batchCapturePresetLimit == null
      ? settings.batchCapturePresetIds.length
      : Math.min(settings.batchCapturePresetLimit, settings.batchCapturePresetIds.length);
  const socialDraftBlockedReason = !hasGenerationModel
    ? 'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.'
    : settings.projectUrlError;
  const socialBatchCaptureBlockedReason = hasBatchCaptureConfig
    ? null
    : !settings.batchCaptureBaseUrl.trim()
      ? 'Set a batch capture base URL in Social Settings first.'
      : 'Select at least one capture preset in Social Settings first.';
  const socialVisionWarning = resolvedVisionModelId
    ? null
    : 'Visual analysis is not configured. Choose a StudiQ Social vision model in Settings or assign AI Brain routing to enable screenshot analysis.';
  const persistedProgrammableCaptureBaseUrl =
    settings.persistedSocialSettings.programmableCaptureBaseUrl;
  const persistedProgrammableCapturePersonaId =
    settings.persistedSocialSettings.programmableCapturePersonaId;
  const persistedProgrammableCaptureScript =
    settings.persistedSocialSettings.programmableCaptureScript;
  const persistedProgrammableCaptureRoutes =
    settings.persistedSocialSettings.programmableCaptureRoutes;
  const hasSavedProgrammableCaptureDefaults =
    Boolean(persistedProgrammableCaptureBaseUrl?.trim()) ||
    Boolean(persistedProgrammableCapturePersonaId?.trim()) ||
    persistedProgrammableCaptureRoutes.length > 0 ||
    persistedProgrammableCaptureScript !== KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;

  const editor = useSocialEditorSync({
    linkedinConnections: settings.linkedinConnections,
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
  });
  const canRunVisualAnalysisPipeline =
    hasGenerationModel &&
    Boolean(resolvedVisionModelId) &&
    editor.imageAddonIds.length > 0;
  const socialVisualAnalysisBlockedReason = !hasGenerationModel
    ? socialDraftBlockedReason
    : !resolvedVisionModelId
      ? socialVisionWarning
      : editor.imageAddonIds.length === 0
        ? 'Select at least one image add-on before running image analysis.'
        : null;

  const buildSocialContext = useCallback((overrides?: Record<string, unknown>): Record<string, unknown> => ({
    postId: editor.activePost?.id ?? null,
    status: editor.activePost?.status ?? null,
    scheduledAt: parseDatetimeLocal(editor.scheduledAt),
    imageCount: editor.imageAssets.length,
    imageAddonCount: editor.imageAddonIds.length,
    docReferenceCount: editor.resolveDocReferences().length,
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
    recentAddons: editor.recentAddons,
    resolveDocReferences: editor.resolveDocReferences,
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
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
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
    canGenerateDraft: canGenerateSocialDraft,
    generateDraftBlockedReason: socialDraftBlockedReason,
    imageAddonIds: editor.imageAddonIds,
    projectUrl: settings.projectUrl,
    setActivePostId: editor.setActivePostId,
    setEditorState: editor.setEditorState,
    setContextSummary: editor.setContextSummary,
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
    brainModelId: resolvedBrainModelId,
    visionModelId: resolvedVisionModelId,
    canRunServerPipeline: canGenerateSocialDraft,
    pipelineBlockedReason: socialDraftBlockedReason,
    canRunVisualAnalysisPipeline,
    visualAnalysisBlockedReason: socialVisualAnalysisBlockedReason,
    projectUrl: settings.projectUrl,
    generationNotes: editor.generationNotes,
    resolveDocReferences: editor.resolveDocReferences,
    buildSocialContext,
    handleLoadContext: context.handleLoadContext,
    setContextSummary: editor.setContextSummary,
    setActivePostId: editor.setActivePostId,
    setEditorState: editor.setEditorState,
    setImageAddonIds: editor.setImageAddonIds,
    setImageAssets: editor.setImageAssets,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleSelectAddons: editor.handleSelectAddons,
  });

  const missingImageAddons = useSocialMissingImageAddons({
    editor,
    crud,
    buildSocialContext,
  });

  const captureFlows = useSocialCaptureFlows({
    editor,
    crud,
    imageAddons,
    settings,
    pipeline,
    buildSocialContext,
    canGenerateSocialDraft,
    socialDraftBlockedReason,
    hasBatchCaptureConfig,
    socialBatchCaptureBlockedReason,
    effectiveBatchCapturePresetCount,
  });

  const telemetry = useSocialModelTelemetry({
    settings,
    buildSocialContext,
  });

  const handleRunFullPipeline = useCallback(async (): Promise<void> => {
    captureFlows.handleCloseProgrammablePlaywrightModal();
    await pipeline.handleRunFullPipeline();
  }, [pipeline.handleRunFullPipeline, captureFlows.handleCloseProgrammablePlaywrightModal]);

  const handleRunFullPipelineWithFreshCapture = useCallback(async (): Promise<void> => {
    captureFlows.handleCloseProgrammablePlaywrightModal();
    await pipeline.handleRunFullPipelineWithFreshCapture();
  }, [pipeline.handleRunFullPipelineWithFreshCapture, captureFlows.handleCloseProgrammablePlaywrightModal]);

  const handleGeneratePostWithVisualAnalysis = useCallback(async (): Promise<void> => {
    if (!pipeline.visualAnalysisResult) {
      return;
    }

    const didGenerate = await generation.handleGenerateWithVisualAnalysis(
      pipeline.visualAnalysisResult
    );
    if (didGenerate) {
      pipeline.handleCloseVisualAnalysisModal();
    }
  }, [
    generation.handleGenerateWithVisualAnalysis,
    pipeline.handleCloseVisualAnalysisModal,
    pipeline.visualAnalysisResult,
  ]);

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
    missingSelectedImageAddonIds: editor.missingSelectedImageAddonIds,
    setImageAddonIds: editor.setImageAddonIds,
    addonForm: editor.addonForm,
    setAddonForm: editor.setAddonForm,
    showMediaLibrary: editor.showMediaLibrary,
    setShowMediaLibrary: editor.setShowMediaLibrary,
    hasUnsavedChanges: editor.hasUnsavedChanges,
    resolveDocReferences: editor.resolveDocReferences,
    handleAddImages: editor.handleAddImages,
    handleRemoveImage: editor.handleRemoveImage,
    handleSelectAddon: editor.handleSelectAddon,
    handleRemoveAddon: editor.handleRemoveAddon,
    handleRefreshMissingImageAddons: missingImageAddons.handleRefreshMissingImageAddons,
    handleRemoveMissingAddons: missingImageAddons.handleRemoveMissingAddons,
    missingImageAddonActionPending: missingImageAddons.missingImageAddonActionPending,
    missingImageAddonActionErrorMessage: missingImageAddons.missingImageAddonActionErrorMessage,

    // Settings
    linkedinConnectionId: settings.linkedinConnectionId,
    brainModelId: settings.brainModelId,
    visionModelId: settings.visionModelId,
    canGenerateSocialDraft,
    canRunVisualAnalysisPipeline,
    socialDraftBlockedReason,
    socialVisualAnalysisBlockedReason,
    hasBatchCaptureConfig,
    canRunFreshCapturePipeline: canGenerateSocialDraft && hasBatchCaptureConfig,
    socialBatchCaptureBlockedReason,
    socialVisionWarning,
    projectUrl: settings.projectUrl,
    projectUrlError: settings.projectUrlError,
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
    handleBrainModelChange: telemetry.handleBrainModelChange,
    handleVisionModelChange: telemetry.handleVisionModelChange,
    handleLinkedInConnectionChange: telemetry.handleLinkedInConnectionChange,
    handleToggleCapturePreset: settings.handleToggleCapturePreset,
    selectAllCapturePresets: settings.selectAllCapturePresets,
    clearCapturePresets: settings.clearCapturePresets,
    linkedinIntegration: settings.linkedinIntegration,
    linkedinConnections: settings.linkedinConnections,
    brainModelOptions: settings.brainModelOptions,
    visionModelOptions: settings.visionModelOptions,
    persistedProgrammableCaptureBaseUrl,
    persistedProgrammableCapturePersonaId,
    persistedProgrammableCaptureScript,
    persistedProgrammableCaptureRoutes,
    hasSavedProgrammableCaptureDefaults,

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
    batchCapturePending: imageAddons.batchCapturePending,
    batchCaptureJob: imageAddons.batchCaptureJob,
    batchCaptureMessage: imageAddons.batchCaptureMessage,
    batchCaptureErrorMessage: imageAddons.batchCaptureErrorMessage,
    captureAppearanceMode: imageAddons.captureAppearanceMode,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleCreateAddon: imageAddons.handleCreateAddon,
    handleBatchCapture: imageAddons.handleBatchCapture,
    handleRetryFailedPresetBatchCaptureJob:
      imageAddons.handleRetryFailedPresetBatchCaptureJob,

    // Context
    contextSummary: editor.contextSummary,
    contextLoading: context.contextLoading,
    handleLoadContext: context.handleLoadContext,

    // Generation
    generateMutation: generation.generateMutation,
    currentGenerationJob: generation.currentGenerationJob,
    handleGenerate: generation.handleGenerate,
    handleGenerateWithVisualAnalysis: generation.handleGenerateWithVisualAnalysis,

    // Pipeline
    pipelineStep: pipeline.pipelineStep,
    pipelineProgress: pipeline.pipelineProgress,
    pipelineErrorMessage: pipeline.pipelineErrorMessage,
    currentPipelineJob: pipeline.currentPipelineJob,
    currentVisualAnalysisJob: pipeline.currentVisualAnalysisJob,
    isVisualAnalysisModalOpen: pipeline.isVisualAnalysisModalOpen,
    visualAnalysisResult: pipeline.visualAnalysisResult,
    hasSavedVisualAnalysis: pipeline.hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale: pipeline.isSavedVisualAnalysisStale,
    visualAnalysisErrorMessage: pipeline.visualAnalysisErrorMessage,
    visualAnalysisPending: pipeline.visualAnalysisPending,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal: pipeline.handleOpenVisualAnalysisModal,
    handleCloseVisualAnalysisModal: pipeline.handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals: pipeline.handleAnalyzeSelectedVisuals,
    handleGeneratePostWithVisualAnalysis,
    captureOnlyPending: captureFlows.captureOnlyPending,
    captureOnlyBatchCaptureJob: captureFlows.captureOnlyBatchCaptureJob,
    captureOnlyMessage: captureFlows.captureOnlyMessage,
    captureOnlyErrorMessage: captureFlows.captureOnlyErrorMessage,
    handleCaptureImagesOnly: captureFlows.handleCaptureImagesOnly,
    isProgrammablePlaywrightModalOpen: captureFlows.isProgrammablePlaywrightModalOpen,
    programmableCaptureBaseUrl: captureFlows.programmableCaptureBaseUrl,
    setProgrammableCaptureBaseUrl: captureFlows.setProgrammableCaptureBaseUrl,
    programmableCapturePersonaId: captureFlows.programmableCapturePersonaId,
    setProgrammableCapturePersonaId: captureFlows.setProgrammableCapturePersonaId,
    programmableCaptureScript: captureFlows.programmableCaptureScript,
    setProgrammableCaptureScript: captureFlows.setProgrammableCaptureScript,
    programmableCaptureRoutes: captureFlows.programmableCaptureRoutes,
    programmableCapturePending: captureFlows.programmableCapturePending,
    programmableCaptureBatchCaptureJob: captureFlows.programmableCaptureBatchCaptureJob,
    programmableCaptureMessage: captureFlows.programmableCaptureMessage,
    programmableCaptureErrorMessage: captureFlows.programmableCaptureErrorMessage,
    handleOpenProgrammablePlaywrightModal: captureFlows.handleOpenProgrammablePlaywrightModal,
    handleOpenProgrammablePlaywrightModalFromDefaults: captureFlows.handleOpenProgrammablePlaywrightModalFromDefaults,
    handleCloseProgrammablePlaywrightModal: captureFlows.handleCloseProgrammablePlaywrightModal,
    handleAddProgrammableCaptureRoute: captureFlows.handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute: captureFlows.handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute: captureFlows.handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets: captureFlows.handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript: captureFlows.handleResetProgrammableCaptureScript,
    handleSaveProgrammableCaptureDefaults: captureFlows.handleSaveProgrammableCaptureDefaults,
    handleResetProgrammableCaptureDefaults: captureFlows.handleResetProgrammableCaptureDefaults,
    handleRunProgrammablePlaywrightCapture: captureFlows.handleRunProgrammablePlaywrightCapture,
    handleRunProgrammablePlaywrightCaptureAndPipeline: captureFlows.handleRunProgrammablePlaywrightCaptureAndPipeline,
    handleRetryFailedProgrammableCaptureJob: captureFlows.handleRetryFailedProgrammableCaptureJob,

    // Queries (for isPending checks in consumer)
    postsQuery: editor.postsQuery,
    addonsQuery: editor.addonsQuery,
  };
}
