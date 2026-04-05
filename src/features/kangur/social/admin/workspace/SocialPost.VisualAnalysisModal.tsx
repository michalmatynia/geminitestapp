'use client';

import React from 'react';

import {
  Badge,
  Button,
  FormModal,
  LoadingState,
} from '@/features/kangur/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';

import { resolveImagePreview } from './AdminKangurSocialPage.Constants';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel, SocialJobStatusPill } from './SocialJobStatusPill';
import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostVisualAnalysisModal(): React.JSX.Element | null {
  const {
    activePost,
    isVisualAnalysisModalOpen,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleGeneratePostWithVisualAnalysis,
    visualAnalysisResult,
    visualAnalysisErrorMessage,
    visualAnalysisPending,
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
    imageAddonIds,
    missingSelectedImageAddonIds,
    recentAddons,
    addonsQuery,
    handleRefreshMissingImageAddons,
    handleRemoveMissingAddons,
    missingImageAddonActionPending,
    missingImageAddonActionErrorMessage,
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    visionModelId,
    visionModelOptions,
  } = useSocialPostContext();
  const selectedImageAddonIds = Array.isArray(imageAddonIds) ? imageAddonIds : [];
  const availableRecentAddons = Array.isArray(recentAddons) ? recentAddons : [];
  const missingAddonIds = Array.isArray(missingSelectedImageAddonIds)
    ? missingSelectedImageAddonIds
    : [];
  const shouldLoadPersonas =
    isVisualAnalysisModalOpen &&
    availableRecentAddons.some(
      (addon) =>
        selectedImageAddonIds.includes(addon.id) && Boolean(addon.playwrightPersonaId?.trim())
    );

  const selectedAddons = React.useMemo(
    () => availableRecentAddons.filter((addon) => selectedImageAddonIds.includes(addon.id)),
    [availableRecentAddons, selectedImageAddonIds]
  );
  const selectedVisualCount = selectedImageAddonIds.length;
  const missingSelectedAddonCount = missingAddonIds.length;
  const isRefreshingImageAddons =
    missingImageAddonActionPending === 'refresh' || Boolean(addonsQuery?.isFetching);
  const isRemovingMissingAddons = missingImageAddonActionPending === 'remove';
  const isMissingImageAddonActionPending =
    isRefreshingImageAddons || isRemovingMissingAddons;
  const refetchImageAddons = (): void => {
    if (typeof handleRefreshMissingImageAddons === 'function') {
      void handleRefreshMissingImageAddons();
    }
  };
  const removeMissingAddons = (): void => {
    if (typeof handleRemoveMissingAddons === 'function') {
      void handleRemoveMissingAddons();
    }
  };
  const personasQuery = usePlaywrightPersonas({
    enabled: shouldLoadPersonas,
  });
  const personaNameById = React.useMemo(
    () =>
      new Map(
        (personasQuery.data ?? [])
          .filter((persona) => Boolean(persona.id?.trim()))
          .map((persona) => [persona.id.trim(), persona.name?.trim() || persona.id.trim()])
      ),
    [personasQuery.data]
  );
  const resolvedVisionModelLabel =
    visionModelId?.trim() ||
    visionModelOptions?.effectiveModelId?.trim() ||
    'Not configured';
  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const visualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const visualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const savedVisualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const savedVisualAnalysisError = activePost?.visualAnalysisError?.trim() ?? '';
  const visualAnalysisStatus = currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus;
  const visualAnalysisJobId = currentVisualAnalysisJob?.id?.trim() ?? savedVisualAnalysisJobId;
  const visualAnalysisStatusLabel = getSocialJobStatusLabel(visualAnalysisStatus);
  const hasSavedAnalysisMetadata = Boolean(
    visualAnalysisStatusLabel ||
      visualAnalysisUpdatedAt ||
      visualAnalysisModelId ||
      visualAnalysisJobId
  );
  const hasFailedSavedAnalysis = visualAnalysisStatus === 'failed';
  const effectiveVisualAnalysisErrorMessage =
    visualAnalysisErrorMessage?.trim() ||
    currentVisualAnalysisJob?.failedReason?.trim() ||
    (hasFailedSavedAnalysis ? savedVisualAnalysisError : '') ||
    '';
  const runtimeVisualAnalysisStatus = visualAnalysisStatus;
  const runtimeVisualAnalysisTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    hasFailedSavedAnalysis && !currentVisualAnalysisJob?.failedReason
      ? savedVisualAnalysisError
      : null,
    visualAnalysisJobId ? `Queue job: ${visualAnalysisJobId}` : null,
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
  const currentGenerationJobTitle = [
    currentGenerationJob?.progress?.message ?? null,
    currentGenerationJob?.failedReason ?? null,
    currentGenerationJob?.id ? `Queue job: ${currentGenerationJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const visualAnalysisHighlights = visualAnalysisResult?.highlights ?? [];
  const isVisualAnalysisJobInFlight =
    visualAnalysisPending || isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status);
  const isGenerationJobInFlight = isSocialRuntimeJobInFlight(currentGenerationJob?.status);
  const isPipelineJobInFlight = isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const isFollowUpGenerationInFlight =
    isGenerationJobInFlight || isPipelineJobInFlight;
  const saveText = isPipelineJobInFlight
    ? 'Full pipeline in progress...'
    : isGenerationJobInFlight
      ? 'Generate post in progress...'
      : 'Generate post with analysis';
  const saveButtonTitle =
    isVisualAnalysisJobInFlight || isFollowUpGenerationInFlight
      ? 'Wait for the current Social runtime job to finish.'
      : !visualAnalysisResult
        ? isSavedVisualAnalysisStale && hasSavedVisualAnalysis
          ? 'Rerun image analysis before generating post copy from visuals.'
          : hasFailedSavedAnalysis
            ? 'Rerun image analysis before generating post copy from visuals.'
            : 'Run image analysis before generating post copy from visuals.'
        : 'Generate post with analysis';
  const analyzeButtonTitle =
    selectedVisualCount === 0
      ? 'Select at least one image add-on before running image analysis.'
      : missingSelectedAddonCount > 0
        ? 'Some selected image add-ons are missing from the loaded list. Refresh the image add-ons or remove the missing selections before running image analysis.'
        : isVisualAnalysisJobInFlight
        ? 'Wait for the current Social runtime job to finish.'
        : 'Analyze selected visuals';

  return (
    <FormModal
      open={isVisualAnalysisModalOpen}
      onClose={handleCloseVisualAnalysisModal}
      title='Image analysis pipeline'
      subtitle='Analyze the selected visuals to produce a visual description first. Then use Generate post with analysis to combine that description with the current context in a separate AI pass.'
      onSave={() => {
        void handleGeneratePostWithVisualAnalysis();
      }}
      saveText={saveText}
      saveTitle={saveButtonTitle}
      isSaveDisabled={!visualAnalysisResult || isVisualAnalysisJobInFlight || isFollowUpGenerationInFlight}
      showSaveButton={true}
      cancelText='Close'
      size='xl'
      actions={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void handleAnalyzeSelectedVisuals();
          }}
          disabled={
            isVisualAnalysisJobInFlight ||
            selectedVisualCount === 0 ||
            missingSelectedAddonCount > 0
          }
          title={analyzeButtonTitle}
        >
          {isVisualAnalysisJobInFlight ? 'Analyzing visuals...' : 'Analyze selected visuals'}
        </Button>
      }
    >
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant='outline'>Vision model: {resolvedVisionModelLabel}</Badge>
          <Badge variant='outline'>
            {selectedVisualCount} selected visual{selectedVisualCount === 1 ? '' : 's'}
          </Badge>
          {runtimeVisualAnalysisStatus ? (
            <SocialJobStatusPill
              status={runtimeVisualAnalysisStatus}
              label='Image analysis'
              title={runtimeVisualAnalysisTitle || undefined}
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

        {selectedVisualCount === 0 ? (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            Select at least one image add-on before running image analysis.
          </div>
        ) : missingSelectedAddonCount > 0 ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            <div>
              {missingSelectedAddonCount === 1
                ? '1 selected image add-on is missing from the loaded list. Refresh the image add-ons and try again.'
                : `${missingSelectedAddonCount} selected image add-ons are missing from the loaded list. Refresh the image add-ons and try again.`}
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={refetchImageAddons}
                disabled={isMissingImageAddonActionPending}
              >
                {isRefreshingImageAddons ? 'Refreshing image add-ons...' : 'Refresh image add-ons'}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={removeMissingAddons}
                disabled={isMissingImageAddonActionPending}
              >
                {isRemovingMissingAddons ? 'Removing missing add-ons...' : 'Remove missing add-ons'}
              </Button>
            </div>
            {missingImageAddonActionErrorMessage ? (
              <div className='mt-2 text-xs text-destructive'>
                {missingImageAddonActionErrorMessage}
              </div>
            ) : null}
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {selectedAddons.map((addon) => {
              const captureDetailLabels = getSocialPostAddonCaptureDetailLabels(addon, {
                personaNameById,
              });
              return (
                <div
                  key={addon.id}
                  className='rounded-xl border border-border/60 bg-background/40 p-2'
                >
                  <div className='overflow-hidden rounded-lg border border-border/50'>
                    <img
                      src={resolveImagePreview(addon.imageAsset)}
                      alt={addon.title || 'Selected visual'}
                      className='h-28 w-full object-cover'
                      loading='lazy'
                    />
                  </div>
                  <div className='mt-2 text-xs'>
                    <div className='font-medium text-foreground/90'>{addon.title}</div>
                    {addon.description ? (
                      <div className='mt-1 text-muted-foreground'>{addon.description}</div>
                    ) : null}
                    {captureDetailLabels.length > 0 ? (
                      <div className='mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground'>
                        {captureDetailLabels.map((label) => (
                          <span
                            key={`${addon.id}-${label}`}
                            className='rounded-full border border-border/50 px-1.5 py-0.5'
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {visualAnalysisPending ? (
          <LoadingState
            message='Running image analysis on the selected visuals...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-6'
          />
        ) : null}

        {effectiveVisualAnalysisErrorMessage ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {effectiveVisualAnalysisErrorMessage}
          </div>
        ) : null}

        {hasSavedAnalysisMetadata ? (
          <div
            className={
              hasFailedSavedAnalysis
                ? 'rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'
                : 'rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'
            }
          >
            {visualAnalysisStatusLabel ? <div>Status: {visualAnalysisStatusLabel}</div> : null}
            {visualAnalysisUpdatedAt ? (
              <div>Analyzed: {new Date(visualAnalysisUpdatedAt).toLocaleString()}</div>
            ) : null}
            {visualAnalysisModelId ? <div>Model: {visualAnalysisModelId}</div> : null}
            {visualAnalysisJobId ? <div>Queue job: {visualAnalysisJobId}</div> : null}
            {hasFailedSavedAnalysis && savedVisualAnalysisError ? (
              <div>Failure: {savedVisualAnalysisError}</div>
            ) : null}
          </div>
        ) : null}

        {isSavedVisualAnalysisStale && hasSavedVisualAnalysis && !visualAnalysisResult ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            Saved image analysis exists for this draft, but the selected visuals changed.
            Rerun image analysis to refresh it before generating copy.
          </div>
        ) : null}

        {hasFailedSavedAnalysis && !visualAnalysisResult && !visualAnalysisPending ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            The latest saved image-analysis run failed. Review the status above, then rerun image analysis before generating copy from visuals.
          </div>
        ) : null}

        {visualAnalysisResult ? (
          <div className='space-y-4 rounded-xl border border-border/60 bg-background/40 p-4'>
            <div className='space-y-2'>
              <div className='text-sm font-semibold text-foreground'>Analysis summary</div>
              <div className='text-sm text-muted-foreground'>
                {visualAnalysisResult.summary || 'No summary returned.'}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-semibold text-foreground'>Highlights</div>
              {visualAnalysisHighlights.length > 0 ? (
                <ul className='space-y-1 text-sm text-muted-foreground'>
                  {visualAnalysisHighlights.map((highlight) => (
                    <li key={highlight}>- {highlight}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-muted-foreground'>No highlight bullets returned.</div>
              )}
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            {isSavedVisualAnalysisStale && hasSavedVisualAnalysis
              ? 'Rerun image analysis first. After reviewing the refreshed visual description, use Generate post with analysis to create the LinkedIn update in the next AI pass.'
              : hasFailedSavedAnalysis
                ? 'Rerun image analysis first. The latest saved run failed, so there is no usable visual description to generate from yet.'
              : 'Run image analysis first. After reviewing the visual description, use Generate post with analysis to create the LinkedIn update in the next AI pass.'}
          </div>
        )}
      </div>
    </FormModal>
  );
}
