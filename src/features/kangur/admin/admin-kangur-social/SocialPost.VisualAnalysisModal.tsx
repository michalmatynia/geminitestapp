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
import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';

export function SocialPostVisualAnalysisModal(): React.JSX.Element | null {
  const {
    activePost,
    isVisualAnalysisModalOpen,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis,
    visualAnalysisResult,
    visualAnalysisErrorMessage,
    visualAnalysisPending,
    imageAddonIds,
    recentAddons,
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    visionModelId,
    visionModelOptions,
  } = useSocialPostContext();

  const selectedAddons = React.useMemo(
    () => (recentAddons ?? []).filter((addon) => (imageAddonIds ?? []).includes(addon.id)),
    [imageAddonIds, recentAddons]
  );
  const personasQuery = usePlaywrightPersonas({
    enabled: selectedAddons.some((addon) => Boolean(addon.playwrightPersonaId?.trim())),
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
  const visualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const visualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const visualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const visualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const visualAnalysisStatusLabel =
    visualAnalysisStatus === 'queued'
      ? 'Queued'
      : visualAnalysisStatus === 'running'
        ? 'Running'
        : visualAnalysisStatus === 'completed'
          ? 'Completed'
          : visualAnalysisStatus === 'failed'
            ? 'Failed'
            : null;
  const hasSavedAnalysisMetadata = Boolean(
    visualAnalysisStatusLabel ||
      visualAnalysisUpdatedAt ||
      visualAnalysisModelId ||
      visualAnalysisJobId
  );
  const hasFailedSavedAnalysis = visualAnalysisStatus === 'failed';
  const visualAnalysisHighlights = visualAnalysisResult?.highlights ?? [];

  return (
    <FormModal
      open={isVisualAnalysisModalOpen}
      onClose={handleCloseVisualAnalysisModal}
      title='Image analysis pipeline'
      subtitle='Analyze the selected visuals to produce a visual description first. Then use Generate post with analysis to combine that description with the current context in a separate AI pass.'
      onSave={() => {
        void handleRunFullPipelineWithVisualAnalysis();
      }}
      saveText='Generate post with analysis'
      isSaveDisabled={!visualAnalysisResult || visualAnalysisPending}
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
          disabled={visualAnalysisPending || selectedAddons.length === 0}
        >
          {visualAnalysisPending ? 'Analyzing visuals...' : 'Analyze selected visuals'}
        </Button>
      }
    >
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant='outline'>Vision model: {resolvedVisionModelLabel}</Badge>
          <Badge variant='outline'>
            {selectedAddons.length} selected visual{selectedAddons.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {selectedAddons.length === 0 ? (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            Select at least one image add-on before running image analysis.
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

        {visualAnalysisErrorMessage ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {visualAnalysisErrorMessage}
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
