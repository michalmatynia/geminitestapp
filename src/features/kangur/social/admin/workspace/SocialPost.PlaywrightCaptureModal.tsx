'use client';

import React from 'react';

import {
  buildKangurSocialProgrammableCaptureRuntimeRequestPreview,
  validateKangurSocialProgrammableCaptureRoutes,
} from '@/features/kangur/social/shared/social-playwright-capture';
import {
  buildKangurSocialCaptureFailureSummary,
  buildKangurSocialCapturePrimaryIssueSummary,
} from '@/features/kangur/social/shared/social-capture-feedback';
import {
  Button,
  FormField,
  FormModal,
  Input,
  LoadingState,
  SelectSimple,
  Textarea,
} from '@/features/kangur/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';

import { SocialJobStatusPill } from './SocialJobStatusPill';
import { SocialCaptureBatchHistory } from './SocialCaptureBatchHistory';
import { useSocialPostContext } from './SocialPostContext';

const PLAYWRIGHT_RUNTIME_PERSONA_VALUE = '';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostPlaywrightCaptureModal(): React.JSX.Element {
  const {
    activePost,
    isProgrammablePlaywrightModalOpen,
    handleCloseProgrammablePlaywrightModal,
    captureAppearanceMode,
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
    batchCaptureRecentJobs = [],
    handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript,
    handleSaveProgrammableCaptureDefaults,
    handleRunProgrammablePlaywrightCapture,
    handleRunProgrammablePlaywrightCaptureAndPipeline,
    handleRetryFailedProgrammableCaptureJob,
    canGenerateSocialDraft,
    currentVisualAnalysisJob,
    currentGenerationJob,
    currentPipelineJob,
    socialDraftBlockedReason,
  } = useSocialPostContext();
  const personasQuery = usePlaywrightPersonas({
    enabled: isProgrammablePlaywrightModalOpen,
  });

  const personaOptions = React.useMemo(
    () => [
      { value: PLAYWRIGHT_RUNTIME_PERSONA_VALUE, label: 'Default runtime persona' },
      ...((personasQuery.data ?? []).map((persona) => ({
        value: persona.id,
        label: persona.name,
      })) ?? []),
    ],
    [personasQuery.data]
  );

  const currentVisualAnalysisJobTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    currentVisualAnalysisJob?.id ? `Queue job: ${currentVisualAnalysisJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const currentGenerationJobTitle = [
    currentGenerationJob?.progress?.message ?? null,
    currentGenerationJob?.failedReason ?? null,
    currentGenerationJob?.id ? `Queue job: ${currentGenerationJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const currentPipelineJobTitle = [
    currentPipelineJob?.progress?.message ?? null,
    currentPipelineJob?.failedReason ?? null,
    currentPipelineJob?.id ? `Queue job: ${currentPipelineJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const isVisualAnalysisJobInFlight = isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status);
  const isGenerationJobInFlight = isSocialRuntimeJobInFlight(currentGenerationJob?.status);
  const isPipelineJobInFlight = isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const hasBlockingRuntimeJob =
    isVisualAnalysisJobInFlight || isGenerationJobInFlight || isPipelineJobInFlight;
  const isConfigEditingLocked = programmableCapturePending || hasBlockingRuntimeJob;
  const configLockTitle = isConfigEditingLocked
    ? 'Wait for the current Social runtime job to finish.'
    : undefined;
  const routeValidation = React.useMemo(
    () =>
      validateKangurSocialProgrammableCaptureRoutes(
        programmableCaptureRoutes,
        programmableCaptureBaseUrl
      ),
    [programmableCaptureBaseUrl, programmableCaptureRoutes]
  );
  const routeValidationById = React.useMemo(
    () => new Map(routeValidation.routes.map((route) => [route.routeId, route])),
    [routeValidation.routes]
  );
  const programmableConfigIssue =
    programmableCaptureRoutes.length === 0
      ? 'Add at least one route or seed routes from the current Social presets.'
      : programmableCaptureScript.trim().length === 0
        ? 'Add a Playwright script before starting programmable capture.'
        : routeValidation.firstIssue;
  const hasValidCaptureConfig =
    Boolean(activePost) &&
    programmableCaptureRoutes.length > 0 &&
    programmableCaptureScript.trim().length > 0 &&
    routeValidation.isValid;
  const canSave = hasValidCaptureConfig && !isConfigEditingLocked;
  const canCaptureAndRunPipeline = canSave && canGenerateSocialDraft;
  const captureSaveTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : !activePost
      ? 'Select an active draft before running programmable capture.'
      : !hasValidCaptureConfig
        ? programmableConfigIssue ??
          'Add at least one valid route and a script before starting programmable capture.'
        : 'Capture programmable images';
  const captureAndRunPipelineTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : !activePost
      ? 'Select an active draft before running programmable capture and pipeline.'
      : !hasValidCaptureConfig
        ? programmableConfigIssue ??
          'Add at least one valid route and a script before starting capture and pipeline.'
      : !canGenerateSocialDraft
        ? socialDraftBlockedReason ??
          'Choose a StudiQ Social post model before running capture and pipeline.'
        : 'Capture programmable screenshots, attach them to the draft, and start the normal generation pipeline.';
  const selectedPersonaLabel = React.useMemo(() => {
    const trimmedPersonaId = programmableCapturePersonaId.trim();
    if (!trimmedPersonaId) {
      return 'Default runtime persona';
    }
    return (
      personaOptions.find((option) => option.value === trimmedPersonaId)?.label ?? trimmedPersonaId
    );
  }, [personaOptions, programmableCapturePersonaId]);
  const runtimeRequestPreview = React.useMemo(
    () =>
      buildKangurSocialProgrammableCaptureRuntimeRequestPreview({
        appearanceMode: captureAppearanceMode,
        personaId: programmableCapturePersonaId,
        routes: programmableCaptureRoutes,
        baseUrl: programmableCaptureBaseUrl,
      }),
    [
      captureAppearanceMode,
      programmableCaptureBaseUrl,
      programmableCapturePersonaId,
      programmableCaptureRoutes,
    ]
  );
  const programmableCaptureCompletedCount =
    programmableCaptureBatchCaptureJob?.progress?.completedCount ?? 0;
  const programmableCaptureRemainingCount =
    programmableCaptureBatchCaptureJob?.progress?.remainingCount ?? 0;
  const programmableCaptureTotalCount =
    programmableCaptureBatchCaptureJob?.progress?.totalCount ?? 0;
  const programmableCaptureFailureCount =
    programmableCaptureBatchCaptureJob?.progress?.failureCount ?? 0;
  const shouldShowProgrammableCaptureProgress =
    isSocialRuntimeJobInFlight(programmableCaptureBatchCaptureJob?.status) &&
    programmableCaptureTotalCount > 0;
  const programmableCaptureFailureSummary =
    programmableCaptureBatchCaptureJob?.result?.failures?.length
      ? buildKangurSocialCaptureFailureSummary(
          programmableCaptureBatchCaptureJob.result.failures,
          { routes: programmableCaptureRoutes }
        )
      : null;
  const programmableCapturePrimaryIssueSummary =
    programmableCaptureBatchCaptureJob?.result?.captureResults?.length
      ? buildKangurSocialCapturePrimaryIssueSummary(
          programmableCaptureBatchCaptureJob.result.captureResults,
          { routes: programmableCaptureRoutes }
        )
      : null;
  const recentProgrammableCaptureJobs = React.useMemo(
    () =>
      batchCaptureRecentJobs.filter(
        (job) => (job.request?.playwrightRoutes?.length ?? 0) > 0
      ),
    [batchCaptureRecentJobs]
  );
  const captureAndRunPipelineText = isPipelineJobInFlight
    ? 'Full pipeline in progress...'
    : hasBlockingRuntimeJob
      ? 'Generate post in progress...'
      : 'Capture + run pipeline';
  return (
    <FormModal
      open={isProgrammablePlaywrightModalOpen}
      onClose={handleCloseProgrammablePlaywrightModal}
      title='Programmable Playwright capture'
      subtitle='Choose a persona, edit the script, and define custom capture routes for fresh Social visuals.'
      onSave={() => {
        void handleRunProgrammablePlaywrightCapture();
      }}
      saveText={isConfigEditingLocked ? 'Capture in progress...' : 'Capture programmable images'}
      saveTitle={captureSaveTitle}
      isSaveDisabled={!canSave}
      showSaveButton={true}
      cancelText='Close'
      size='xl'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleAddProgrammableCaptureRoute}
            disabled={isConfigEditingLocked}
            title={configLockTitle}
          >
            Add route
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleSeedProgrammableCaptureRoutesFromPresets}
            disabled={isConfigEditingLocked}
            title={configLockTitle}
          >
            Seed from presets
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleResetProgrammableCaptureScript}
            disabled={isConfigEditingLocked}
            title={configLockTitle}
          >
            Reset script
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              void handleSaveProgrammableCaptureDefaults();
            }}
            disabled={isConfigEditingLocked}
            title={configLockTitle}
          >
            Save as defaults
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField
            label='Base URL'
            description='The modal routes are resolved against this URL unless you provide full absolute URLs.'
          >
            <Input
              type='url'
              value={programmableCaptureBaseUrl}
              onChange={(event) => setProgrammableCaptureBaseUrl(event.target.value)}
              placeholder='https://example.com'
              aria-label='Programmable capture base URL'
              disabled={isConfigEditingLocked}
              title={configLockTitle}
            />
          </FormField>

          <FormField
            label='Playwright persona'
            description='Use an existing persona to control browser behavior and fidelity.'
          >
            <SelectSimple
              value={programmableCapturePersonaId}
              onValueChange={setProgrammableCapturePersonaId}
              options={personaOptions}
              placeholder='Default runtime persona'
              ariaLabel='Playwright persona'
              disabled={isConfigEditingLocked}
              title={configLockTitle}
            />
          </FormField>
        </div>

        {personasQuery.isLoading ? (
          <LoadingState
            message='Loading Playwright personas...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-4'
          />
        ) : null}

        {personasQuery.error ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            Failed to load Playwright personas. The default runtime persona will still work.
          </div>
        ) : null}

        {(currentVisualAnalysisJob?.status ||
          currentGenerationJob?.status ||
          currentPipelineJob?.status) ? (
          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
            <span className='font-medium text-foreground/80'>Runtime jobs:</span>
            {currentVisualAnalysisJob?.status ? (
              <SocialJobStatusPill
                status={currentVisualAnalysisJob.status}
                label='Image analysis'
                title={currentVisualAnalysisJobTitle || undefined}
                className='text-[10px]'
              />
            ) : null}
            {currentGenerationJob?.status ? (
              <SocialJobStatusPill
                status={currentGenerationJob.status}
                label='Generate post'
                title={currentGenerationJobTitle || undefined}
                className='text-[10px]'
              />
            ) : null}
            {currentPipelineJob?.status ? (
              <SocialJobStatusPill
                status={currentPipelineJob.status}
                label='Full pipeline'
                title={currentPipelineJobTitle || undefined}
                className='text-[10px]'
              />
            ) : null}
          </div>
        ) : null}

        {!activePost ? (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            No active draft is selected. You can still edit the programmable Playwright config and save it as defaults, but capture actions stay disabled until a draft is active.
          </div>
        ) : null}

        {routeValidation.issueCount > 0 ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            Fix {routeValidation.issueCount} programmable route issue
            {routeValidation.issueCount === 1 ? '' : 's'} before starting capture.
            {routeValidation.firstIssue ? ` ${routeValidation.firstIssue}` : ''}
          </div>
        ) : null}

        {shouldShowProgrammableCaptureProgress ? (
          <div className='grid grid-cols-3 gap-2 text-xs'>
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
              <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                Captured
              </div>
              <div className='mt-1 font-semibold text-foreground'>
                {programmableCaptureCompletedCount}
              </div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
              <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                Left
              </div>
              <div className='mt-1 font-semibold text-foreground'>
                {programmableCaptureRemainingCount}
              </div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
              <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                Total
              </div>
              <div className='mt-1 font-semibold text-foreground'>
                {programmableCaptureTotalCount}
                {programmableCaptureFailureCount > 0 ? (
                  <span className='ml-2 text-[10px] font-medium text-destructive'>
                    {programmableCaptureFailureCount} failed
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-4'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Capture routes</div>
            <div className='text-xs text-muted-foreground'>
              Each route becomes one programmable screenshot target passed into the Playwright script as `input.captures`.
            </div>
          </div>

          {programmableCaptureRoutes.length === 0 ? (
            <div className='rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground'>
              Add at least one route or seed routes from the current Social presets.
            </div>
          ) : (
            <div className='space-y-3'>
              {programmableCaptureRoutes.map((route, index) => {
                const routeValidationState = routeValidationById.get(route.id) ?? null;

                return (
                  <div
                    key={route.id}
                    className={`space-y-3 rounded-lg border px-3 py-3 ${
                      routeValidationState?.issue
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border/60 bg-background'
                    }`}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div className='text-sm font-medium text-foreground'>
                        Route {index + 1}
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='xs'
                        onClick={() => handleRemoveProgrammableCaptureRoute(route.id)}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className='grid gap-3 md:grid-cols-2'>
                      <Input
                        value={route.title}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            title: event.target.value,
                          })
                        }
                        placeholder='Route title'
                        aria-label={`Programmable route ${index + 1} title`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                      <Input
                        value={route.path}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            path: event.target.value,
                          })
                        }
                        placeholder='/pricing or https://example.com/pricing'
                        aria-label={`Programmable route ${index + 1} path`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                      <Input
                        value={route.selector ?? ''}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            selector: event.target.value,
                          })
                        }
                        placeholder='Optional selector'
                        aria-label={`Programmable route ${index + 1} selector`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                      <Input
                        value={route.description ?? ''}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder='Optional description'
                        aria-label={`Programmable route ${index + 1} description`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                      <Input
                        type='number'
                        min='0'
                        step='100'
                        value={route.waitForMs ?? 0}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            waitForMs: Number.isFinite(Number(event.target.value))
                              ? Math.max(0, Number(event.target.value))
                              : 0,
                          })
                        }
                        placeholder='Wait before capture (ms)'
                        aria-label={`Programmable route ${index + 1} wait before capture`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                      <Input
                        type='number'
                        min='0'
                        step='100'
                        value={route.waitForSelectorMs ?? 10000}
                        onChange={(event) =>
                          handleUpdateProgrammableCaptureRoute(route.id, {
                            waitForSelectorMs: Number.isFinite(Number(event.target.value))
                              ? Math.max(0, Number(event.target.value))
                              : 10000,
                          })
                        }
                        placeholder='Wait for selector (ms)'
                        aria-label={`Programmable route ${index + 1} wait for selector`}
                        disabled={isConfigEditingLocked}
                        title={configLockTitle}
                      />
                    </div>

                    <div
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        routeValidationState?.issue
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                          : 'border-border/50 bg-background/80 text-muted-foreground'
                      }`}
                    >
                      <div className='font-medium uppercase tracking-wide text-foreground/80'>
                        Resolved target
                      </div>
                      {routeValidationState?.resolvedUrl ? (
                        <div className='mt-1 break-all'>{routeValidationState.resolvedUrl}</div>
                      ) : null}
                      {routeValidationState?.issue ? (
                        <div className='mt-1'>{routeValidationState.issue}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <FormField
          label='Playwright script'
          description='This script is fully editable and runs in the existing Playwright node runtime.'
        >
          <Textarea
            value={programmableCaptureScript}
            onChange={(event) => setProgrammableCaptureScript(event.target.value)}
            rows={18}
            className='font-mono text-xs'
            aria-label='Programmable Playwright capture script'
            disabled={isConfigEditingLocked}
            title={configLockTitle}
          />
        </FormField>

        <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-4'>
          <div className='text-sm font-semibold text-foreground'>Runtime request preview</div>
          <div className='text-xs text-muted-foreground'>
            This mirrors the request sent to the Playwright runtime. Inside the script, use <code>input.appearanceMode</code> and <code>input.captures</code>.
          </div>
          <div className='grid gap-2 text-xs text-muted-foreground md:grid-cols-2'>
            <div>
              <span className='font-medium text-foreground'>Appearance mode:</span>{' '}
              {captureAppearanceMode}
            </div>
            <div>
              <span className='font-medium text-foreground'>Persona:</span> {selectedPersonaLabel}
            </div>
          </div>
          <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background px-3 py-2 text-[11px] text-muted-foreground'>
            {JSON.stringify(runtimeRequestPreview, null, 2)}
          </pre>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={() => {
              void handleRunProgrammablePlaywrightCaptureAndPipeline();
            }}
            disabled={!canCaptureAndRunPipeline}
            title={captureAndRunPipelineTitle}
          >
            {captureAndRunPipelineText}
          </Button>
        </div>

        {programmableCapturePending ? (
          <LoadingState
            message='Running programmable Playwright capture...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-4'
          />
        ) : null}

        {programmableCaptureMessage ? (
          <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200'>
            {programmableCaptureMessage}
          </div>
        ) : null}

        {programmableCaptureErrorMessage ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {programmableCaptureErrorMessage}
          </div>
        ) : null}

        {programmableCapturePrimaryIssueSummary ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            Last failed target: {programmableCapturePrimaryIssueSummary}
          </div>
        ) : null}

        {programmableCaptureFailureSummary &&
        ((programmableCaptureBatchCaptureJob?.result?.failures.length ?? 0) > 1 ||
          !programmableCapturePrimaryIssueSummary) ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            Failed targets: {programmableCaptureFailureSummary}
          </div>
        ) : null}

        <SocialCaptureBatchHistory
          config={{
            title: 'Recent programmable runs',
            description: 'Durable programmable capture history with retry for failed routes.',
            emptyMessage: 'No recent programmable capture runs yet.',
            retryKind: 'programmable',
            retryDisabled: isConfigEditingLocked,
            retryTitle: configLockTitle,
          }}
          jobs={recentProgrammableCaptureJobs}
          routes={programmableCaptureRoutes}
          actions={{
            onRetryFailed: (job) => {
              void handleRetryFailedProgrammableCaptureJob(job);
            },
          }}
        />
      </div>
    </FormModal>
  );
}
