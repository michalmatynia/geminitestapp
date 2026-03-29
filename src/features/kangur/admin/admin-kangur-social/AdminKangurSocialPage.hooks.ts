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
import type { KangurSocialImageAddonsBatchResult, KangurSocialProgrammableCaptureRoute } from '@/shared/contracts/kangur-social-image-addons';
import {
  buildKangurSocialProgrammableCaptureRoutesFromPresetIds,
  createEmptyKangurSocialProgrammableCaptureRoute,
  KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/kangur/shared/social-playwright-capture';

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
  const canRunVisualAnalysisPipeline =
    canGenerateSocialDraft &&
    Boolean(resolvedVisionModelId) &&
    editor.imageAddonIds.length > 0;
  const socialVisualAnalysisBlockedReason = !canGenerateSocialDraft
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
    setDocUpdatesResult: generation.setDocUpdatesResult,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleSelectAddons: editor.handleSelectAddons,
  });

  const [captureOnlyPending, setCaptureOnlyPending] = useState(false);
  const [captureOnlyMessage, setCaptureOnlyMessage] = useState<string | null>(null);
  const [captureOnlyErrorMessage, setCaptureOnlyErrorMessage] = useState<string | null>(null);
  const [isProgrammablePlaywrightModalOpen, setIsProgrammablePlaywrightModalOpen] = useState(false);
  const [programmableCaptureBaseUrl, setProgrammableCaptureBaseUrl] = useState(
    settings.batchCaptureBaseUrl
  );
  const [programmableCapturePersonaId, setProgrammableCapturePersonaId] = useState('');
  const [programmableCaptureScript, setProgrammableCaptureScript] = useState(
    KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
  );
  const [programmableCaptureRoutes, setProgrammableCaptureRoutes] = useState<
    KangurSocialProgrammableCaptureRoute[]
  >(() =>
    buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
  );
  const [programmableCapturePending, setProgrammableCapturePending] = useState(false);
  const [programmableCaptureMessage, setProgrammableCaptureMessage] = useState<string | null>(null);
  const [programmableCaptureErrorMessage, setProgrammableCaptureErrorMessage] =
    useState<string | null>(null);

  const attachBatchCaptureResultToActiveDraft = useCallback(
    async (result: KangurSocialImageAddonsBatchResult): Promise<void> => {
      if (!editor.activePost || result.addons.length === 0) {
        return;
      }

      const nextImageAddonIds = Array.from(
        new Set([...editor.imageAddonIds, ...result.addons.map((addon) => addon.id)])
      );
      const nextImageAssets = mergeImageAssets(
        editor.imageAssets,
        result.addons
          .map((addon) => addon.imageAsset)
          .filter((asset): asset is ImageFileSelection => Boolean(asset))
      );

      const patched = await crud.patchMutation.mutateAsync({
        id: editor.activePost.id,
        updates: {
          imageAddonIds: nextImageAddonIds,
          imageAssets: nextImageAssets,
        },
      });

      editor.setImageAddonIds(patched.imageAddonIds ?? nextImageAddonIds);
      editor.setImageAssets(patched.imageAssets ?? nextImageAssets);
    },
    [
      crud.patchMutation,
      editor.activePost,
      editor.imageAddonIds,
      editor.imageAssets,
      editor.setImageAddonIds,
      editor.setImageAssets,
    ]
  );

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
      await attachBatchCaptureResultToActiveDraft(result);

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
    attachBatchCaptureResultToActiveDraft,
  ]);

  const handleOpenProgrammablePlaywrightModal = useCallback((): void => {
    setCaptureOnlyMessage(null);
    setCaptureOnlyErrorMessage(null);
    setProgrammableCaptureMessage(null);
    setProgrammableCaptureErrorMessage(null);
    setProgrammableCaptureBaseUrl((current) => current.trim() || settings.batchCaptureBaseUrl);
    setProgrammableCaptureRoutes((current) =>
      current.length > 0
        ? current
        : buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
    );
    setIsProgrammablePlaywrightModalOpen(true);
  }, [settings.batchCaptureBaseUrl, settings.batchCapturePresetIds]);

  const handleCloseProgrammablePlaywrightModal = useCallback((): void => {
    if (programmableCapturePending) {
      return;
    }
    setIsProgrammablePlaywrightModalOpen(false);
  }, [programmableCapturePending]);

  const handleAddProgrammableCaptureRoute = useCallback((): void => {
    setProgrammableCaptureRoutes((current) => [
      ...current,
      createEmptyKangurSocialProgrammableCaptureRoute(current.length + 1),
    ]);
  }, []);

  const handleUpdateProgrammableCaptureRoute = useCallback(
    (
      routeId: string,
      patch: Partial<KangurSocialProgrammableCaptureRoute>
    ): void => {
      setProgrammableCaptureRoutes((current) =>
        current.map((route) => (route.id === routeId ? { ...route, ...patch } : route))
      );
    },
    []
  );

  const handleRemoveProgrammableCaptureRoute = useCallback((routeId: string): void => {
    setProgrammableCaptureRoutes((current) => current.filter((route) => route.id !== routeId));
  }, []);

  const handleSeedProgrammableCaptureRoutesFromPresets = useCallback((): void => {
    setProgrammableCaptureRoutes(
      buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
    );
  }, [settings.batchCapturePresetIds]);

  const handleResetProgrammableCaptureScript = useCallback((): void => {
    setProgrammableCaptureScript(KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT);
  }, []);

  const handleRunProgrammablePlaywrightCapture = useCallback(async (): Promise<void> => {
    if (!editor.activePost) {
      setProgrammableCaptureMessage(null);
      setProgrammableCaptureErrorMessage('Create or select a draft before capturing images.');
      return;
    }

    setProgrammableCapturePending(true);
    setProgrammableCaptureMessage('Running programmable Playwright capture and linking the images to the active draft...');
    setProgrammableCaptureErrorMessage(null);

    try {
      const result = await imageAddons.runBatchCapture({
        baseUrl: programmableCaptureBaseUrl,
        presetIds: [],
        presetLimit: null,
        playwrightPersonaId: programmableCapturePersonaId || null,
        playwrightScript: programmableCaptureScript,
        playwrightRoutes: programmableCaptureRoutes,
      });
      await attachBatchCaptureResultToActiveDraft(result);
      const routeCount = programmableCaptureRoutes.length;
      setProgrammableCaptureMessage(
        result.addons.length > 0
          ? `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${routeCount} programmable route${routeCount === 1 ? '' : 's'} and linked them to the draft.`
          : 'Programmable capture finished with no new screenshots to attach.'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to run programmable Playwright capture.';
      setProgrammableCaptureMessage(null);
      setProgrammableCaptureErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'programmablePlaywrightCapture',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setProgrammableCapturePending(false);
    }
  }, [
    attachBatchCaptureResultToActiveDraft,
    buildSocialContext,
    editor.activePost,
    imageAddons,
    programmableCaptureBaseUrl,
    programmableCapturePersonaId,
    programmableCaptureRoutes,
    programmableCaptureScript,
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
    hasUnsavedChanges: editor.hasUnsavedChanges,
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
    canRunVisualAnalysisPipeline,
    socialDraftBlockedReason,
    socialVisualAnalysisBlockedReason,
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
    isVisualAnalysisModalOpen: pipeline.isVisualAnalysisModalOpen,
    visualAnalysisResult: pipeline.visualAnalysisResult,
    visualAnalysisErrorMessage: pipeline.visualAnalysisErrorMessage,
    visualAnalysisPending: pipeline.visualAnalysisPending,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal: pipeline.handleOpenVisualAnalysisModal,
    handleCloseVisualAnalysisModal: pipeline.handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals: pipeline.handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis:
      pipeline.handleRunFullPipelineWithVisualAnalysis,
    captureOnlyPending,
    captureOnlyMessage,
    captureOnlyErrorMessage,
    handleCaptureImagesOnly,
    isProgrammablePlaywrightModalOpen,
    programmableCaptureBaseUrl,
    setProgrammableCaptureBaseUrl,
    programmableCapturePersonaId,
    setProgrammableCapturePersonaId,
    programmableCaptureScript,
    setProgrammableCaptureScript,
    programmableCaptureRoutes,
    programmableCapturePending,
    programmableCaptureMessage,
    programmableCaptureErrorMessage,
    handleOpenProgrammablePlaywrightModal,
    handleCloseProgrammablePlaywrightModal,
    handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript,
    handleRunProgrammablePlaywrightCapture,

    // Queries (for isPending checks in consumer)
    postsQuery: editor.postsQuery,
    addonsQuery: editor.addonsQuery,
  };
}
