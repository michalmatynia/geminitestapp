'use client';

import React from 'react';
import {
  Badge,
  Button,
  FormSection,
  LoadingState,
  Textarea,
} from '@/features/kangur/shared/ui';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { resolveImagePreview } from './AdminKangurSocialPage.Constants';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';

export function SocialPostVisuals({
  activePost,
  recentAddons,
  recentAddonsLoading,
  selectedAddonSet,
  handleSelectAddon,
  handleRemoveAddon,
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
  showImagesPanel = true,
}: {
  activePost: KangurSocialPost | null;
  recentAddons: KangurSocialImageAddon[];
  recentAddonsLoading: boolean;
  selectedAddonSet: Set<string>;
  handleSelectAddon: (addon: KangurSocialImageAddon) => void;
  handleRemoveAddon: (id: string) => void;
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  showImagesPanel?: boolean;
}): React.JSX.Element {
  return (
    <>
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
                  ) : preview ? (
                    <div className='overflow-hidden rounded-lg border border-border/50'>
                      <img
                        src={preview}
                        alt={addon.title || 'Social add-on'}
                        className='h-32 w-full object-cover'
                        loading='lazy'
                      />
                    </div>
                  ) : (
                    <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                      Preview unavailable
                    </div>
                  )}
                  <div className='mt-2 flex items-start justify-between gap-2 text-xs text-muted-foreground'>
                    <div className='min-w-0 space-y-1'>
                      <div className='font-semibold text-foreground'>
                        {addon.title || 'Untitled add-on'}
                        {hasComparison ? (
                          <Badge variant='outline' className='ml-2 text-[10px]'>
                            Change detected
                          </Badge>
                        ) : null}
                      </div>
                      {addon.description ? (
                        <div className='text-muted-foreground'>{addon.description}</div>
                      ) : null}
                      {addon.sourceUrl ? (
                        <a
                          href={addon.sourceUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-[11px] text-muted-foreground underline'
                        >
                          Source
                        </a>
                      ) : null}
                    </div>
                    <Button
                      type='button'
                      size='xs'
                      variant={isSelected ? 'ghost' : 'outline'}
                      onClick={() =>
                        isSelected ? handleRemoveAddon(addon.id) : handleSelectAddon(addon)
                      }
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {showImagesPanel ? (
        <SocialPostImagesPanel
          imageAssets={imageAssets}
          handleRemoveImage={handleRemoveImage}
          setShowMediaLibrary={setShowMediaLibrary}
          showMediaLibrary={showMediaLibrary}
          handleAddImages={handleAddImages}
        />
      ) : null}

      <FormSection title='Visual analysis' className='space-y-3'>
        {activePost?.visualSummary ? (
          <Textarea
            value={activePost.visualSummary}
            rows={4}
            readOnly
            className='text-xs'
          />
        ) : (
          <div className='text-xs text-muted-foreground'>
            Generate a draft with image add-ons to analyze visuals.
          </div>
        )}
        {activePost?.visualHighlights && activePost.visualHighlights.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {activePost.visualHighlights.map((highlight, index) => (
              <Badge key={`${highlight}-${index}`} variant='outline'>
                {highlight}
              </Badge>
            ))}
          </div>
        ) : (
          <div className='text-xs text-muted-foreground'>
            No visual highlights captured yet.
          </div>
        )}
      </FormSection>
    </>
  );
}
