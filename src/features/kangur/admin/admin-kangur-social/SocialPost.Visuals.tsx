'use client';

import React, { useMemo } from 'react';
import {
  Button,
  FormSection,
  LoadingState,
} from '@/features/kangur/shared/ui';
import { resolveImagePreview } from './AdminKangurSocialPage.Constants';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import { useSocialPostContext } from './SocialPostContext';

type SocialPostVisualsProps = {
  showImagesPanel?: boolean;
};

export function SocialPostVisuals(props: SocialPostVisualsProps): React.JSX.Element {
  const { showImagesPanel = true } = props;
  const {
    activePost,
    recentAddons,
    addonsQuery,
    imageAddonIds,
    handleSelectAddon,
    handleRemoveAddon,
    imageAssets,
    handleRemoveImage,
    setShowMediaLibrary,
    showMediaLibrary,
    handleAddImages,
  } = useSocialPostContext();

  const selectedAddonSet = useMemo(() => new Set(imageAddonIds), [imageAddonIds]);
  const recentAddonsLoading = addonsQuery.isLoading;
  const visualSummary = activePost?.visualSummary?.trim() ?? '';
  const visualHighlights = activePost?.visualHighlights ?? [];
  const visualDocUpdates = activePost?.visualDocUpdates ?? [];
  const visualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const visualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const visualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const visualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const hasVisualAnalysis =
    visualSummary.length > 0 || visualHighlights.length > 0 || visualDocUpdates.length > 0;
  const hasVisualAnalysisSection =
    hasVisualAnalysis ||
    Boolean(
      visualAnalysisStatus || visualAnalysisUpdatedAt || visualAnalysisModelId || visualAnalysisJobId
    );
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

  return (
    <>
      {hasVisualAnalysisSection ? (
        <FormSection title='Image analysis result' className='space-y-3'>
          {visualAnalysisStatusLabel ||
          visualAnalysisUpdatedAt ||
          visualAnalysisModelId ||
          visualAnalysisJobId ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
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
          {visualDocUpdates.length > 0 ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
              <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Suggested documentation updates
              </div>
              <div className='mt-2 space-y-2 text-sm text-muted-foreground'>
                {visualDocUpdates.map((update, index) => (
                  <div key={`${update.docPath}-${update.section ?? 'root'}-${index}`}>
                    <div className='font-medium text-foreground/90'>
                      {update.docPath}
                      {update.section ? ` · ${update.section}` : ''}
                    </div>
                    {update.reason ? <div>{update.reason}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </FormSection>
      ) : null}

      <FormSection title='Image add-ons' className='space-y-3'>
        <div className='text-xs text-muted-foreground'>
          Select existing visual add-ons for this post. Create new captures from the Settings modal.
        </div>
        {recentAddonsLoading ? (
          <LoadingState
            message='Loading image add-ons...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-6'
          />
        ) : recentAddons.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No image add-ons yet.</div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {recentAddons.map((addon) => {
              const preview = resolveImagePreview(addon.imageAsset);
              const isSelected = selectedAddonSet.has(addon.id);
              const previousAddon = addon.previousAddonId
                ? recentAddons.find((a) => a.id === addon.previousAddonId) ?? null
                : null;
              const previousPreview = previousAddon
                ? resolveImagePreview(previousAddon.imageAsset)
                : null;
              const hasComparison = Boolean(previousPreview && preview);
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
                    </div>
                    <Button
                      type='button'
                      variant={isSelected ? 'secondary' : 'outline'}
                      size='xs'
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
        />
      )}
    </>
  );
}
