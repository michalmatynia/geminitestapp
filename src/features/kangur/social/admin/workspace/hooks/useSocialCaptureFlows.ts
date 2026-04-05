'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/features/kangur/shared/ui';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { logKangurClientError } from '@/features/kangur/observability/client';
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
} from '../AdminKangurSocialPage.capture-feedback';
import { mergeSocialPostSelectedAddons } from '../social-post-image-assets';
import type { UseSocialCaptureFlowsProps } from '../AdminKangurSocialPage.types';

export function useSocialCaptureFlows({
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
}: UseSocialCaptureFlowsProps) {
  const { toast } = useToast();

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
    editor.activePost,
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

  return {
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
    // Exported for use in main hook if needed
    attachBatchCaptureResultToActiveDraft,
    waitForBatchCaptureJob,
  };
}
