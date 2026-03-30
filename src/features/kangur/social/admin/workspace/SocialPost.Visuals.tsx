'use client';

import React, { useMemo } from 'react';
import {
  Button,
  FormSection,
  LoadingState,
} from '@/features/kangur/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import { resolveImagePreview } from './AdminKangurSocialPage.Constants';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel, SocialJobStatusPill } from './SocialJobStatusPill';
import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';

type SocialPostVisualsProps = {
  showImagesPanel?: boolean;
};

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostVisuals(props: SocialPostVisualsProps): React.JSX.Element {
  const { showImagesPanel = true } = props;
  const {
    activePost,
    recentAddons,
    addonsQuery,
    imageAddonIds,
    missingSelectedImageAddonIds,
    handleSelectAddon,
    handleRemoveAddon,
    handleRemoveMissingAddons,
    imageAssets,
    handleRemoveImage,
    setShowMediaLibrary,
    showMediaLibrary,
    handleAddImages,
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    currentVisualAnalysisJob,
    currentGenerationJob,
    currentPipelineJob,
  } = useSocialPostContext();
  const selectedImageAddonIds = Array.isArray(imageAddonIds) ? imageAddonIds : [];
  const availableRecentAddons = Array.isArray(recentAddons) ? recentAddons : [];
  const missingAddonIds = Array.isArray(missingSelectedImageAddonIds)
    ? missingSelectedImageAddonIds
    : [];

  const personasQuery = usePlaywrightPersonas({
    enabled: availableRecentAddons.some((addon) => Boolean(addon.playwrightPersonaId?.trim())),
  });
  const selectedAddonSet = useMemo(() => new Set(selectedImageAddonIds), [selectedImageAddonIds]);
  const missingSelectedAddonCount = missingAddonIds.length;
  const isRefreshingImageAddons = Boolean(addonsQuery?.isFetching);
  const refetchImageAddons = (): void => {
    if (typeof addonsQuery?.refetch === 'function') {
      void addonsQuery.refetch();
    }
  };
  const removeMissingAddons = (): void => {
    if (typeof handleRemoveMissingAddons === 'function') {
      handleRemoveMissingAddons();
    }
  };
  const personaNameById = useMemo(
    () =>
      new Map(
        (personasQuery.data ?? [])
          .filter((persona) => Boolean(persona.id?.trim()))
          .map((persona) => [persona.id.trim(), persona.name?.trim() || persona.id.trim()])
      ),
    [personasQuery.data]
  );
  const recentAddonsLoading = Boolean(addonsQuery?.isLoading);
  const visualSummary = activePost?.visualSummary?.trim() ?? '';
  const visualHighlights = activePost?.visualHighlights ?? [];
  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const visualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const visualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const savedVisualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const savedVisualAnalysisError = activePost?.visualAnalysisError?.trim() ?? '';
  const visualAnalysisStatus = currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus;
  const visualAnalysisJobId = currentVisualAnalysisJob?.id?.trim() ?? savedVisualAnalysisJobId;
  const hasVisualAnalysis = visualSummary.length > 0 || visualHighlights.length > 0;
  const hasVisualAnalysisSection =
    hasVisualAnalysis ||
    Boolean(
      visualAnalysisStatus || visualAnalysisUpdatedAt || visualAnalysisModelId || visualAnalysisJobId
    );
  const visualAnalysisStatusLabel = getSocialJobStatusLabel(visualAnalysisStatus);
  const effectiveVisualAnalysisErrorMessage =
    currentVisualAnalysisJob?.failedReason?.trim() ||
    (visualAnalysisStatus === 'failed' ? savedVisualAnalysisError : '') ||
    '';
  const currentVisualAnalysisJobTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    visualAnalysisStatus === 'failed' && !currentVisualAnalysisJob?.failedReason
      ? savedVisualAnalysisError
      : null,
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
  const hasBlockingVisualMutationJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const visualMutationTitle = hasBlockingVisualMutationJob
    ? 'Wait for the current Social runtime job to finish.'
    : undefined;

  return (
    <>
      {hasVisualAnalysisSection ? (
        <FormSection title='Image analysis result' className='space-y-3'>
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
          {isSavedVisualAnalysisStale && hasSavedVisualAnalysis ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
              Saved image analysis exists for this draft, but the selected visuals changed.
              Rerun image analysis before generating new copy from it.
            </div>
          ) : null}
          {effectiveVisualAnalysisErrorMessage ? (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              {effectiveVisualAnalysisErrorMessage}
            </div>
          ) : null}
          {visualAnalysisStatusLabel ||
          visualAnalysisUpdatedAt ||
          visualAnalysisModelId ||
          visualAnalysisJobId ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              {visualAnalysisStatusLabel ? (
                <div className='mb-1'>
                  <SocialJobStatusPill
                    status={visualAnalysisStatus}
                    label='Image analysis'
                    title={currentVisualAnalysisJobTitle || (visualAnalysisJobId ? `Queue job: ${visualAnalysisJobId}` : undefined)}
                    className='text-[10px]'
                  />
                </div>
              ) : null}
              {visualAnalysisStatusLabel ? <div>Status: {visualAnalysisStatusLabel}</div> : null}
              {visualAnalysisUpdatedAt ? (
                <div>Analyzed: {new Date(visualAnalysisUpdatedAt).toLocaleString()}</div>
              ) : null}
              {visualAnalysisModelId ? (
                <div>Model: {visualAnalysisModelId}</div>
              ) : null}
              {visualAnalysisJobId ? (
                <div>Queue job: {visualAnalysisJobId}</div>
              ) : null}
              {visualAnalysisStatus === 'failed' && savedVisualAnalysisError ? (
                <div>Failure: {savedVisualAnalysisError}</div>
              ) : null}
            </div>
          ) : null}
          {!hasVisualAnalysis ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
              No saved analysis summary yet. The queue metadata above reflects the latest image-analysis run for this post.
            </div>
          ) : null}
          {visualSummary ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
              {visualSummary}
            </div>
          ) : null}
          {visualHighlights.length > 0 ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
              <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Highlights
              </div>
              <ul className='mt-2 space-y-1 text-sm text-muted-foreground'>
                {visualHighlights.map((highlight) => (
                  <li key={highlight}>- {highlight}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </FormSection>
      ) : null}

      <FormSection title='Image add-ons' className='space-y-3'>
        <div className='text-xs text-muted-foreground'>
          Select existing visual add-ons for this post. Create new captures from the Settings modal.
        </div>
        {missingSelectedAddonCount > 0 ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            <div>
              {missingSelectedAddonCount === 1
                ? '1 selected image add-on is missing from the loaded list. Refresh the image add-ons to review or remove it here.'
                : `${missingSelectedAddonCount} selected image add-ons are missing from the loaded list. Refresh the image add-ons to review or remove them here.`}
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={refetchImageAddons}
                disabled={isRefreshingImageAddons}
              >
                {isRefreshingImageAddons ? 'Refreshing image add-ons...' : 'Refresh image add-ons'}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={removeMissingAddons}
              >
                Remove missing add-ons
              </Button>
            </div>
          </div>
        ) : null}
        {recentAddonsLoading ? (
          <LoadingState
            message='Loading image add-ons...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-6'
          />
        ) : availableRecentAddons.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No image add-ons yet.</div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {availableRecentAddons.map((addon) => {
              const preview = resolveImagePreview(addon.imageAsset);
              const isSelected = selectedAddonSet.has(addon.id);
              const previousAddon = addon.previousAddonId
                ? availableRecentAddons.find((a) => a.id === addon.previousAddonId) ?? null
                : null;
              const previousPreview = previousAddon
                ? resolveImagePreview(previousAddon.imageAsset)
                : null;
              const hasComparison = Boolean(previousPreview && preview);
              const captureDetailLabels = getSocialPostAddonCaptureDetailLabels(addon, {
                personaNameById,
              });
              return (
                <div
                  key={addon.id}
                  className='rounded-xl border border-border/60 bg-background/40 p-2'
                >
                  {hasComparison ? (
                    <div className='grid grid-cols-2 gap-1'>
                      <div className='space-y-1'>
                        <div className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Before
                        </div>
                        <div className='overflow-hidden rounded-lg border border-border/50'>
                          <img
                            src={previousPreview!}
                            alt={`Before: ${addon.title || 'previous capture'}`}
                            className='h-28 w-full object-cover opacity-75'
                            loading='lazy'
                          />
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <div className='text-[10px] font-medium uppercase tracking-wide text-primary'>
                          After
                        </div>
                        <div className='overflow-hidden rounded-lg border border-primary/40'>
                          <img
                            src={preview}
                            alt={addon.title || 'Social add-on'}
                            className='h-28 w-full object-cover'
                            loading='lazy'
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='overflow-hidden rounded-lg border border-border/50'>
                      <img
                        src={preview}
                        alt={addon.title || 'Social add-on'}
                        className='h-32 w-full object-cover'
                        loading='lazy'
                      />
                    </div>
                  )}
                  <div className='mt-2 flex items-center justify-between gap-2'>
                    <div className='min-w-0 flex-1 space-y-0.5'>
                      <div className='truncate text-[10px] font-medium text-foreground/90'>
                        {addon.title}
                      </div>
                      <div className='truncate text-[9px] text-muted-foreground'>
                        {addon.createdAt ? new Date(addon.createdAt).toLocaleDateString() : ''}
                      </div>
                      {captureDetailLabels.length > 0 ? (
                        <div className='flex flex-wrap gap-1 pt-1 text-[9px] text-muted-foreground'>
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
                    <Button
                      type='button'
                      variant={isSelected ? 'secondary' : 'outline'}
                      size='xs'
                      disabled={hasBlockingVisualMutationJob}
                      title={visualMutationTitle}
                      onClick={() =>
                        isSelected ? handleRemoveAddon(addon.id) : handleSelectAddon(addon)
                      }
                    >
                      {isSelected ? 'Remove' : 'Select'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {showImagesPanel && (
        <SocialPostImagesPanel
          imageAssets={imageAssets}
          handleRemoveImage={handleRemoveImage}
          setShowMediaLibrary={setShowMediaLibrary}
          showMediaLibrary={showMediaLibrary}
          handleAddImages={handleAddImages}
          isInteractionBlocked={hasBlockingVisualMutationJob}
          interactionTitle={visualMutationTitle}
        />
      )}
    </>
  );
}
