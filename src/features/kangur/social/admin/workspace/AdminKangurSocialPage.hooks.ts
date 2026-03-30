'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  trackKangurClientEvent,
  logKangurClientError,
} from '@/features/kangur/observability/client';
import { useToast } from '@/features/kangur/shared/ui';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { parseDatetimeLocal } from './AdminKangurSocialPage.Constants';

import { useSocialSettings } from './hooks/useSocialSettings';
import { useSocialEditorSync } from './hooks/useSocialEditorSync';
import { useSocialPostCrud } from './hooks/useSocialPostCrud';
import { useSocialImageAddons } from './hooks/useSocialImageAddons';
import { useSocialContext } from './hooks/useSocialContext';
import { useSocialGeneration } from './hooks/useSocialGeneration';
import { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  KangurSocialImageAddonsBatchJob,
  KangurSocialImageAddonsBatchResult,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import {
  buildKangurSocialProgrammableCaptureRoutesFromPresetIds,
  createEmptyKangurSocialProgrammableCaptureRoute,
  KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/kangur/social/shared/social-playwright-capture';
import { resolveFailedKangurSocialProgrammableCaptureRoutes } from '@/features/kangur/social/shared/social-capture-feedback';
import {
  appendCaptureFailureSummary,
  BATCH_CAPTURE_POLL_INTERVAL_MS,
  buildCaptureFailureMessage,
  buildLiveBatchCaptureMessage,
  isBatchCaptureJobTerminal,
  waitForDelay,
} from './AdminKangurSocialPage.capture-feedback';
import {
  mergeSocialPostSelectedAddons,
  resolveSocialPostImageState,
} from './social-post-image-assets';

export function useAdminKangurSocialPage() {
  const { toast } = useToast();
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

  const [captureOnlyPending, setCaptureOnlyPending] = useState(false);
  const [captureOnlyMessage, setCaptureOnlyMessage] = useState<string | null>(null);
  const [captureOnlyErrorMessage, setCaptureOnlyErrorMessage] = useState<string | null>(null);
  const [captureOnlyBatchCaptureJob, setCaptureOnlyBatchCaptureJob] =
    useState<KangurSocialImageAddonsBatchJob | null>(null);
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
  const [programmableCaptureBatchCaptureJob, setProgrammableCaptureBatchCaptureJob] =
    useState<KangurSocialImageAddonsBatchJob | null>(null);
  const [missingImageAddonActionPending, setMissingImageAddonActionPending] = useState<
    'refresh' | 'remove' | null
  >(null);
  const [missingImageAddonActionErrorMessage, setMissingImageAddonActionErrorMessage] =
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

      const knownAddons = [
        ...result.addons,
        ...editor.recentAddons.filter(
          (addon) => !result.addons.some((resultAddon) => resultAddon.id === addon.id)
        ),
      ];
      const nextImageState = mergeSocialPostSelectedAddons({
        imageAssets: editor.imageAssets,
        imageAddonIds: editor.imageAddonIds,
        recentAddons: knownAddons,
        nextAddons: result.addons,
      });
      const nextImageAddonIds = nextImageState.imageAddonIds;
      const nextImageAssets = nextImageState.imageAssets;

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
      editor.recentAddons,
      editor.setImageAddonIds,
      editor.setImageAssets,
    ]
  );

  const waitForBatchCaptureJob = useCallback(
    async (
      initialJob: KangurSocialImageAddonsBatchJob,
      onUpdate?: (job: KangurSocialImageAddonsBatchJob) => void
    ): Promise<KangurSocialImageAddonsBatchJob> => {
      let currentJob = initialJob;
      onUpdate?.(currentJob);

      for (let attempt = 0; attempt < 240; attempt += 1) {
        const latestJob = await imageAddons.readBatchCaptureJob(initialJob.id);
        if (latestJob) {
          currentJob = latestJob;
          onUpdate?.(currentJob);
        }

        if (isBatchCaptureJobTerminal(currentJob.status)) {
          return currentJob;
        }

        await waitForDelay(BATCH_CAPTURE_POLL_INTERVAL_MS);
      }

      throw new Error('Timed out waiting for Playwright capture job.');
    },
    [imageAddons]
  );

  const handleRefreshMissingImageAddons = useCallback(async (): Promise<void> => {
    setMissingImageAddonActionErrorMessage(null);
    setMissingImageAddonActionPending('refresh');

    try {
      const refreshTasks: Promise<unknown>[] = [];

      if (typeof editor.addonsQuery.refetch === 'function') {
        refreshTasks.push(Promise.resolve(editor.addonsQuery.refetch()));
      }
      if (typeof editor.postsQuery.refetch === 'function') {
        refreshTasks.push(Promise.resolve(editor.postsQuery.refetch()));
      }

      await Promise.all(refreshTasks);
      toast('Refreshed image add-ons for the current draft.', { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to refresh the selected image add-ons.';
      setMissingImageAddonActionErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'refreshMissingImageAddons',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setMissingImageAddonActionPending(null);
    }
  }, [
    buildSocialContext,
    editor.addonsQuery,
    editor.postsQuery,
    toast,
  ]);

  const handleRemoveMissingAddons = useCallback(async (): Promise<void> => {
    if (!editor.activePost || editor.missingSelectedImageAddonIds.length === 0) {
      return;
    }

    const removedAddonCount = editor.missingSelectedImageAddonIds.length;
    setMissingImageAddonActionErrorMessage(null);
    setMissingImageAddonActionPending('remove');

    try {
      const missingAddonIdSet = new Set(editor.missingSelectedImageAddonIds);
      const nextImageState = resolveSocialPostImageState({
        imageAssets: editor.imageAssets,
        imageAddonIds: editor.imageAddonIds.filter((addonId) => !missingAddonIdSet.has(addonId)),
        recentAddons: editor.recentAddons,
      });
      const patched = await crud.patchMutation.mutateAsync({
        id: editor.activePost.id,
        updates: {
          imageAddonIds: nextImageState.imageAddonIds,
          imageAssets: nextImageState.imageAssets,
        },
      });

      editor.setImageAddonIds(patched.imageAddonIds ?? nextImageState.imageAddonIds);
      editor.setImageAssets(patched.imageAssets ?? nextImageState.imageAssets);
      toast(
        removedAddonCount === 1
          ? 'Removed 1 missing image add-on from the current draft.'
          : `Removed ${removedAddonCount} missing image add-ons from the current draft.`,
        { variant: 'success' }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to remove the missing image add-ons.';
      setMissingImageAddonActionErrorMessage(message);
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'removeMissingImageAddons',
        ...buildSocialContext({ error: true }),
      });
    } finally {
      setMissingImageAddonActionPending(null);
    }
  }, [
    buildSocialContext,
    crud.patchMutation,
    editor.activePost,
    editor.imageAddonIds,
    editor.imageAssets,
    editor.missingSelectedImageAddonIds,
    editor.recentAddons,
    editor.setImageAddonIds,
    editor.setImageAssets,
    toast,
  ]);

  const handleCaptureImagesOnly = useCallback(async (): Promise<void> => {
    if (!editor.activePost) {
      return;
    }
    if (!hasBatchCaptureConfig) {
      setCaptureOnlyBatchCaptureJob(null);
      setCaptureOnlyMessage(null);
      setCaptureOnlyErrorMessage(socialBatchCaptureBlockedReason);
      return;
    }

    setCaptureOnlyPending(true);
    setCaptureOnlyBatchCaptureJob(null);
    setCaptureOnlyErrorMessage(null);
    setCaptureOnlyMessage('Capturing fresh screenshots and linking them to the active draft...');

    try {
      const startedJob = await imageAddons.startBatchCapture();
      const queuedMessage = buildLiveBatchCaptureMessage(startedJob);
      setCaptureOnlyBatchCaptureJob(startedJob);
      if (queuedMessage) {
        setCaptureOnlyMessage(queuedMessage);
      }

      const completedJob = await waitForBatchCaptureJob(startedJob, (job) => {
        setCaptureOnlyBatchCaptureJob(job);
        const liveMessage = buildLiveBatchCaptureMessage(job);
        if (!isBatchCaptureJobTerminal(job.status) && liveMessage) {
          setCaptureOnlyMessage(liveMessage);
        }
      });

      if (completedJob.status !== 'completed' || !completedJob.result) {
        throw new Error(completedJob.error || 'Failed to capture screenshots.');
      }

      const result = completedJob.result;
      await attachBatchCaptureResultToActiveDraft(result);

      const usedPresetCount = result.usedPresetCount ?? effectiveBatchCapturePresetCount;
      if (result.addons.length === 0 && result.failures.length > 0) {
        setCaptureOnlyMessage(null);
        setCaptureOnlyErrorMessage(
          buildCaptureFailureMessage('Failed to capture screenshots.', result.failures)
        );
        return;
      }
      setCaptureOnlyMessage(
        result.addons.length > 0
          ? appendCaptureFailureSummary(
              `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${usedPresetCount} preset${usedPresetCount === 1 ? '' : 's'} and linked them to the draft.`,
              result.failures
            )
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
    waitForBatchCaptureJob,
  ]);

  const openProgrammablePlaywrightModal = useCallback((options?: {
    loadPersistedDefaults?: boolean;
  }): void => {
    const loadPersistedDefaults = options?.loadPersistedDefaults === true;
    setCaptureOnlyMessage(null);
    setCaptureOnlyErrorMessage(null);
    setProgrammableCaptureMessage(null);
    setProgrammableCaptureErrorMessage(null);
    setProgrammableCaptureBatchCaptureJob(null);
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

  const runProgrammableCaptureFlow = useCallback(
    async (params: {
      baseUrl: string;
      personaId: string | null;
      script: string;
      routes: KangurSocialProgrammableCaptureRoute[];
      runPipelineAfterCapture?: boolean;
    }): Promise<void> => {
      if (!editor.activePost) {
        setProgrammableCaptureBatchCaptureJob(null);
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage('Create or select a draft before capturing images.');
        return;
      }

      const shouldRunPipeline = params.runPipelineAfterCapture === true;
      if (shouldRunPipeline && !canGenerateSocialDraft) {
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage(
          socialDraftBlockedReason ??
            'Choose a StudiQ Social post model before running capture and pipeline.'
        );
        return;
      }

      setProgrammableCapturePending(true);
      setProgrammableCaptureBatchCaptureJob(null);
      setProgrammableCaptureMessage(
        shouldRunPipeline
          ? 'Running programmable Playwright capture, linking the images to the draft, and starting the pipeline...'
          : 'Running programmable Playwright capture and linking the images to the active draft...'
      );
      setProgrammableCaptureErrorMessage(null);

      try {
        const startedJob = await imageAddons.startBatchCapture({
          baseUrl: params.baseUrl,
          presetIds: [],
          presetLimit: null,
          playwrightPersonaId: params.personaId,
          playwrightScript: params.script,
          playwrightRoutes: params.routes,
        });
        const queuedMessage = buildLiveBatchCaptureMessage(startedJob);
        setProgrammableCaptureBatchCaptureJob(startedJob);
        if (queuedMessage) {
          setProgrammableCaptureMessage(queuedMessage);
        }

        const completedJob = await waitForBatchCaptureJob(startedJob, (job) => {
          setProgrammableCaptureBatchCaptureJob(job);
          const liveMessage = buildLiveBatchCaptureMessage(job);
          if (!isBatchCaptureJobTerminal(job.status) && liveMessage) {
            setProgrammableCaptureMessage(liveMessage);
          }
        });

        if (completedJob.status !== 'completed' || !completedJob.result) {
          throw new Error(
            completedJob.error ||
              (shouldRunPipeline
                ? 'Failed to run programmable Playwright capture and pipeline.'
                : 'Failed to run programmable Playwright capture.')
          );
        }

        const result = completedJob.result;
        const attached = await attachBatchCaptureResultToActiveDraft(result);
        const routeCount = params.routes.length;

        if (!attached || result.addons.length === 0) {
          if (result.failures.length > 0) {
            setProgrammableCaptureMessage(null);
            setProgrammableCaptureErrorMessage(
              buildCaptureFailureMessage(
                shouldRunPipeline
                  ? 'Programmable capture failed. The pipeline was not started.'
                  : 'Failed to run programmable Playwright capture.',
                result.failures,
                params.routes
              )
            );
            return;
          }

          setProgrammableCaptureMessage(
            shouldRunPipeline
              ? 'Programmable capture finished with no new screenshots to attach. The pipeline was not started.'
              : 'Programmable capture finished with no new screenshots to attach.'
          );
          return;
        }

        if (!shouldRunPipeline) {
          setProgrammableCaptureMessage(
            appendCaptureFailureSummary(
              `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${routeCount} programmable route${routeCount === 1 ? '' : 's'} and linked them to the draft.`,
              result.failures,
              params.routes
            )
          );
          return;
        }

        setProgrammableCaptureMessage(
          appendCaptureFailureSummary(
            `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} from ${routeCount} programmable route${routeCount === 1 ? '' : 's'}. Starting the draft pipeline now...`,
            result.failures,
            params.routes
          )
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
            : shouldRunPipeline
              ? 'Failed to run programmable Playwright capture and pipeline.'
              : 'Failed to run programmable Playwright capture.';
        setProgrammableCaptureMessage(null);
        setProgrammableCaptureErrorMessage(message);
        void ErrorSystem.captureException(error);
        logKangurClientError(error, {
          source: 'AdminKangurSocialPage',
          action: shouldRunPipeline
            ? 'programmablePlaywrightCaptureAndPipeline'
            : 'programmablePlaywrightCapture',
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
      socialDraftBlockedReason,
      waitForBatchCaptureJob,
    ]
  );

  const handleRunProgrammablePlaywrightCapture = useCallback(async (): Promise<void> => {
    await runProgrammableCaptureFlow({
      baseUrl: programmableCaptureBaseUrl,
      personaId: programmableCapturePersonaId || null,
      script: programmableCaptureScript,
      routes: programmableCaptureRoutes,
    });
  }, [
    programmableCaptureBaseUrl,
    programmableCapturePersonaId,
    programmableCaptureRoutes,
    programmableCaptureScript,
    runProgrammableCaptureFlow,
  ]);

  const handleRunProgrammablePlaywrightCaptureAndPipeline = useCallback(
    async (): Promise<void> => {
      await runProgrammableCaptureFlow({
        baseUrl: programmableCaptureBaseUrl,
        personaId: programmableCapturePersonaId || null,
        script: programmableCaptureScript,
        routes: programmableCaptureRoutes,
        runPipelineAfterCapture: true,
      });
    },
    [
      programmableCaptureBaseUrl,
      programmableCapturePersonaId,
      programmableCaptureRoutes,
      programmableCaptureScript,
      runProgrammableCaptureFlow,
    ]
  );

  const handleRetryFailedProgrammableCaptureJob = useCallback(
    async (job: KangurSocialImageAddonsBatchJob): Promise<void> => {
      const storedRoutes = job.request?.playwrightRoutes ?? [];
      const failedRoutes = resolveFailedKangurSocialProgrammableCaptureRoutes(
        job.result?.failures ?? [],
        storedRoutes
      );

      if (failedRoutes.length === 0) {
        toast('This run has no failed programmable routes to retry.', {
          variant: 'warning',
        });
        return;
      }

      const nextBaseUrl = job.request?.baseUrl ?? settings.batchCaptureBaseUrl;
      const nextPersonaId = job.request?.playwrightPersonaId ?? null;
      const nextScript =
        job.request?.playwrightScript ?? KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;

      setProgrammableCaptureBaseUrl(nextBaseUrl);
      setProgrammableCapturePersonaId(nextPersonaId ?? '');
      setProgrammableCaptureScript(nextScript);
      setProgrammableCaptureRoutes(storedRoutes);

      await runProgrammableCaptureFlow({
        baseUrl: nextBaseUrl,
        personaId: nextPersonaId,
        script: nextScript,
        routes: failedRoutes,
      });
    },
    [runProgrammableCaptureFlow, settings.batchCaptureBaseUrl, toast]
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
    handleRefreshMissingImageAddons,
    handleRemoveMissingAddons,
    missingImageAddonActionPending,
    missingImageAddonActionErrorMessage,

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
    batchCapturePending: imageAddons.batchCapturePending,
    batchCaptureJob: imageAddons.batchCaptureJob,
    batchCaptureMessage: imageAddons.batchCaptureMessage,
    batchCaptureErrorMessage: imageAddons.batchCaptureErrorMessage,
    batchCaptureRecentJobs: imageAddons.batchCaptureRecentJobs,
    batchCaptureRecentJobsLoading: imageAddons.batchCaptureRecentJobsLoading,
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
    captureOnlyPending,
    captureOnlyBatchCaptureJob,
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
    programmableCaptureBatchCaptureJob,
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
    handleRetryFailedProgrammableCaptureJob,

    // Queries (for isPending checks in consumer)
    postsQuery: editor.postsQuery,
    addonsQuery: editor.addonsQuery,
  };
}
