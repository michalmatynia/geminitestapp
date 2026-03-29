'use client';

import React from 'react';

import {
  Badge,
  Button,
  FormModal,
  LoadingState,
} from '@/features/kangur/shared/ui';

import { resolveImagePreview } from './AdminKangurSocialPage.Constants';
import { useSocialPostContext } from './SocialPostContext';

export function SocialPostVisualAnalysisModal(): React.JSX.Element | null {
  const {
    isVisualAnalysisModalOpen,
    handleCloseVisualAnalysisModal,
    handleAnalyzeSelectedVisuals,
    handleRunFullPipelineWithVisualAnalysis,
    visualAnalysisResult,
    visualAnalysisErrorMessage,
    visualAnalysisPending,
    imageAddonIds,
    recentAddons,
    visionModelId,
    visionModelOptions,
  } = useSocialPostContext();

  const selectedAddons = React.useMemo(
    () => (recentAddons ?? []).filter((addon) => (imageAddonIds ?? []).includes(addon.id)),
    [imageAddonIds, recentAddons]
  );
  const resolvedVisionModelLabel =
    visionModelId?.trim() ||
    visionModelOptions?.effectiveModelId?.trim() ||
    'Not configured';

  return (
    <FormModal
      open={isVisualAnalysisModalOpen}
      onClose={handleCloseVisualAnalysisModal}
      title='Image analysis pipeline'
      subtitle='Analyze the selected visuals first, then generate a post that explicitly mentions the findings.'
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
            {selectedAddons.map((addon) => (
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
                </div>
              </div>
            ))}
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
              {visualAnalysisResult.highlights.length > 0 ? (
                <ul className='space-y-1 text-sm text-muted-foreground'>
                  {visualAnalysisResult.highlights.map((highlight) => (
                    <li key={highlight}>- {highlight}</li>
                  ))}
                </ul>
              ) : (
                <div className='text-sm text-muted-foreground'>No highlight bullets returned.</div>
              )}
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-semibold text-foreground'>
                Suggested documentation updates
              </div>
              {visualAnalysisResult.docUpdates.length > 0 ? (
                <div className='space-y-2 text-sm text-muted-foreground'>
                  {visualAnalysisResult.docUpdates.map((update, index) => (
                    <div
                      key={`${update.docPath}-${update.section ?? 'root'}-${index}`}
                      className='rounded-lg border border-border/50 bg-background/50 px-3 py-2'
                    >
                      <div className='font-medium text-foreground/90'>
                        {update.docPath}
                        {update.section ? ` · ${update.section}` : ''}
                      </div>
                      {update.reason ? <div className='mt-1'>{update.reason}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  No documentation updates suggested by the analysis.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            Run image analysis first. After reviewing the summary, generate the post to inject the findings into the description.
          </div>
        )}
      </div>
    </FormModal>
  );
}
