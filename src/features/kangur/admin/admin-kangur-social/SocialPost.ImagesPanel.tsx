'use client';

import React from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

import { MediaLibraryPanel } from '@/features/cms/public';
import { Button, FormSection } from '@/features/kangur/shared/ui';
import type { ImageFileSelection } from '@/shared/contracts/files';

import { resolveImagePreview } from './AdminKangurSocialPage.Constants';

type SocialPostImagesPanelResolvedProps = {
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  isInteractionBlocked?: boolean;
  interactionTitle?: string;
};

const renderSocialPostImagesPanel = ({
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
  isInteractionBlocked = false,
  interactionTitle,
}: SocialPostImagesPanelResolvedProps): React.JSX.Element => (
  <FormSection title='Images' className='space-y-3'>
    {imageAssets.length === 0 ? (
      <div className='text-xs text-muted-foreground'>No images selected yet.</div>
    ) : (
      <div className='grid gap-3 sm:grid-cols-2'>
        {imageAssets.map((asset) => {
          const preview = resolveImagePreview(asset);
          return (
            <div
              key={asset.id}
              className='rounded-xl border border-border/60 bg-background/40 p-2'
            >
              {preview ? (
                <div className='overflow-hidden rounded-lg border border-border/50'>
                  <img
                    src={preview}
                    alt={asset.filename ?? asset.id ?? 'Social image'}
                    className='h-32 w-full object-cover'
                    loading='lazy'
                  />
                </div>
              ) : (
                <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                  Preview unavailable
                </div>
              )}
              <div className='mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                <span className='truncate'>{asset.filename ?? asset.filepath ?? asset.id}</span>
                <Button
                  type='button'
                  size='xs'
                  variant='ghost'
                  onClick={() => {
                    if (isInteractionBlocked) return;
                    handleRemoveImage(asset.id);
                  }}
                  disabled={isInteractionBlocked}
                  aria-label='Remove image'
                  title={isInteractionBlocked ? interactionTitle : 'Remove image'}
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    )}
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        if (isInteractionBlocked) return;
        setShowMediaLibrary(true);
      }}
      disabled={isInteractionBlocked}
      title={isInteractionBlocked ? interactionTitle : 'Add images'}
      className='inline-flex items-center gap-2'
    >
      <ImagePlus className='h-4 w-4' />
      Add images
    </Button>
    <MediaLibraryPanel
      open={showMediaLibrary}
      onOpenChange={setShowMediaLibrary}
      selectionMode='multiple'
      onSelect={(filepaths) => {
        if (isInteractionBlocked) return;
        handleAddImages(filepaths);
      }}
      title='Select social images'
    />
  </FormSection>
);

export function SocialPostImagesPanel({
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
  isInteractionBlocked,
  interactionTitle,
}: {
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  isInteractionBlocked?: boolean;
  interactionTitle?: string;
}): React.JSX.Element {
  return renderSocialPostImagesPanel({
    imageAssets,
    handleRemoveImage,
    setShowMediaLibrary,
    showMediaLibrary,
    handleAddImages,
    isInteractionBlocked,
    interactionTitle,
  });
}
