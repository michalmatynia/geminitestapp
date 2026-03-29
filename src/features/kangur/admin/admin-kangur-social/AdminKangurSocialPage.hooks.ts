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

  const [captureOnlyPending, setCaptureOnlyPending] = useState(false);
  const [captureOnlyMessage, setCaptureOnlyMessage] = useState<string | null>(null);
  const [captureOnlyErrorMessage, setCaptureOnlyErrorMessage] = useState<string | null>(null);
  const [isProgrammablePlaywrightModalOpen, setIsProgrammablePlaywrightModalOpen] = useState(false);
  const [programmableCaptureBaseUrl, setProgrammableCaptureBaseUrl] = useState(
    settings.persistedSocialSettings.programmableCaptureBaseUrl ?? settings.batchCaptureBaseUrl
  );
  const [programmableCapturePersonaId, setProgrammableCapturePersonaId] = useState(
    settings.persistedSocialSettings.programmableCapturePersonaId ?? ''
  );
  const [programmableCaptureScript, setProgrammableCaptureScript] = useState(
    settings.persistedSocialSettings.programmableCaptureScript ||
      KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
  );
  const [programmableCaptureRoutes, setProgrammableCaptureRoutes] = useState<
    KangurSocialProgrammableCaptureRoute[]
  >(() =>
    settings.persistedSocialSettings.programmableCaptureRoutes.length > 0
      ? settings.persistedSocialSettings.programmableCaptureRoutes
      : buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
  );
  const [programmableCapturePending, setProgrammableCapturePending] = useState(false);
  const [programmableCaptureMessage, setProgrammableCaptureMessage] = useState<string | null>(null);
  const [programmableCaptureErrorMessage, setProgrammableCaptureErrorMessage] =
    useState<string | null>(null);

  const attachBatchCaptureResultToActiveDraft = useCallback(
    async (
      result: KangurSocialImageAddonsBatchResult
    ): Promise<{
      imageAddonIds: string[];
      imageAssets: ImageFileSelection[];
    } | null> => {
      if (!editor.activePost || result.addons.length === 0) {
        return null;
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

      return {
        imageAddonIds: patched.imageAddonIds ?? nextImageAddonIds,
        imageAssets: patched.imageAssets ?? nextImageAssets,
      };
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

  const openProgrammablePlaywrightModal = useCallback((options?: {
    loadPersistedDefaults?: boolean;
  }): void => {
    const loadPersistedDefaults = options?.loadPersistedDefaults === true;
    setCaptureOnlyMessage(null);
    setCaptureOnlyErrorMessage(null);
    setProgrammableCaptureMessage(null);
    setProgrammableCaptureErrorMessage(null);
    setProgrammableCaptureBaseUrl(
      (current) =>
        loadPersistedDefaults
          ? settings.persistedSocialSettings.programmableCaptureBaseUrl ||
            settings.batchCaptureBaseUrl
          : current.trim() ||
            settings.persistedSocialSettings.programmableCaptureBaseUrl ||
            settings.batchCaptureBaseUrl
    );
    setProgrammableCapturePersonaId(
      (current) =>
        loadPersistedDefaults
          ? settings.persistedSocialSettings.programmableCapturePersonaId || ''
          : current.trim() || settings.persistedSocialSettings.programmableCapturePersonaId || ''
    );
    setProgrammableCaptureScript(
      (current) =>
        loadPersistedDefaults
          ? settings.persistedSocialSettings.programmableCaptureScript ||
            KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
          : current.trim() ||
            settings.persistedSocialSettings.programmableCaptureScript ||
            KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
    );
    setProgrammableCaptureRoutes((current) =>
      loadPersistedDefaults
        ? settings.persistedSocialSettings.programmableCaptureRoutes.length > 0
          ? settings.persistedSocialSettings.programmableCaptureRoutes
          : buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
        : current.length > 0
          ? current
          : settings.persistedSocialSettings.programmableCaptureRoutes.length > 0
            ? settings.persistedSocialSettings.programmableCaptureRoutes
            : buildKangurSocialProgrammableCaptureRoutesFromPresetIds(
                settings.batchCapturePresetIds
              )
    );
    setIsProgrammablePlaywrightModalOpen(true);
  }, [
    settings.batchCaptureBaseUrl,
    settings.batchCapturePresetIds,
    settings.persistedSocialSettings.programmableCaptureBaseUrl,
    settings.persistedSocialSettings.programmableCapturePersonaId,
    settings.persistedSocialSettings.programmableCaptureRoutes,
    settings.persistedSocialSettings.programmableCaptureScript,
  ]);

  const handleOpenProgrammablePlaywrightModal = useCallback((): void => {
    openProgrammablePlaywrightModal();
  }, [openProgrammablePlaywrightModal]);

  const handleOpenProgrammablePlaywrightModalFromDefaults = useCallback((): void => {
    openProgrammablePlaywrightModal({ loadPersistedDefaults: true });
  }, [openProgrammablePlaywrightModal]);

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

  const handleSaveProgrammableCaptureDefaults = useCallback(async (): Promise<void> => {
    await settings.handleSaveProgrammableCaptureDefaults({
      baseUrl: programmableCaptureBaseUrl.trim() || null,
      personaId: programmableCapturePersonaId.trim() || null,
      script: programmableCaptureScript,
      routes: programmableCaptureRoutes,
    });
  }, [
    programmableCaptureBaseUrl,
    programmableCapturePersonaId,
    programmableCaptureRoutes,
    programmableCaptureScript,
    settings,
  ]);

  const handleResetProgrammableCaptureDefaults = useCallback(async (): Promise<void> => {
    const didSave = await settings.handleSaveProgrammableCaptureDefaults({
      baseUrl: null,
      personaId: null,
      script: KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
      routes: [],
    });
    if (!didSave) {
      return;
    }
    setProgrammableCaptureBaseUrl(settings.batchCaptureBaseUrl);
    setProgrammableCapturePersonaId('');
    setProgrammableCaptureScript(KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT);
    setProgrammableCaptureRoutes(
      buildKangurSocialProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
    );
    setProgrammableCaptureMessage(null);
    setProgrammableCaptureErrorMessage(null);
  }, [settings]);

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

  const handleRunProgrammablePlaywrightCaptureAndPipeline = useCallback(
    async (): Promise<void> => {
      if (!editor.activePost) {
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage('Create or select a draft before capturing images.');
        return;
      }

      if (!canGenerateSocialDraft) {
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage(
          socialDraftBlockedReason ??
            'Choose a StudiQ Social post model before running capture and pipeline.'
        );
        return;
      }

      setProgrammableCapturePending(true);
      setProgrammableCaptureMessage(
        'Running programmable Playwright capture, linking the images to the draft, and starting the pipeline...'
      );
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
        const attached = await attachBatchCaptureResultToActiveDraft(result);
        const routeCount = programmableCaptureRoutes.length;

        if (!attached || result.addons.length === 0) {
          setProgrammableCaptureMessage(
            'Programmable capture finished with no new screenshots to attach. The pipeline was not started.'
          );
          return;
        }

        setProgrammableCaptureMessage(
          `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${routeCount} programmable route${routeCount === 1 ? '' : 's'}. Starting the draft pipeline now...`
        );
        setIsProgrammablePlaywrightModalOpen(false);
        setProgrammableCapturePending(false);

        await pipeline.handleRunFullPipelineWithOverrides({
          imageAddonIds: attached.imageAddonIds,
          imageAssets: attached.imageAssets,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to run programmable Playwright capture and pipeline.';
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage(message);
        void ErrorSystem.captureException(error);
        logKangurClientError(error, {
          source: 'AdminKangurSocialPage',
          action: 'programmablePlaywrightCaptureAndPipeline',
          ...buildSocialContext({ error: true }),
        });
      } finally {
        setProgrammableCapturePending(false);
      }
    },
    [
      attachBatchCaptureResultToActiveDraft,
      buildSocialContext,
      canGenerateSocialDraft,
      editor.activePost,
      imageAddons,
      pipeline,
      programmableCaptureBaseUrl,
      programmableCapturePersonaId,
      programmableCaptureRoutes,
      programmableCaptureScript,
      socialDraftBlockedReason,
    ]
  );

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
    captureAppearanceMode: imageAddons.captureAppearanceMode,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleCreateAddon: imageAddons.handleCreateAddon,
    handleBatchCapture: imageAddons.handleBatchCapture,

    // Context
    contextSummary: editor.contextSummary,
    contextLoading: context.contextLoading,
    handleLoadContext: context.handleLoadContext,

    // Generation
    generateMutation: generation.generateMutation,
    currentGenerationJob: generation.currentGenerationJob,
    handleGenerate: generation.handleGenerate,

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
    handleOpenProgrammablePlaywrightModalFromDefaults,
    handleCloseProgrammablePlaywrightModal,
    handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript,
    handleSaveProgrammableCaptureDefaults,
    handleResetProgrammableCaptureDefaults,
    handleRunProgrammablePlaywrightCapture,
    handleRunProgrammablePlaywrightCaptureAndPipeline,

    // Queries (for isPending checks in consumer)
    postsQuery: editor.postsQuery,
    addonsQuery: editor.addonsQuery,
  };
}
