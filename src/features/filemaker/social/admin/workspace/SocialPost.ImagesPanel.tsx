'use client';

import React from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

import { MediaLibraryPanel } from '@/features/cms/public';
import { Button, FormSection } from '@/shared/ui';
import type { ImageFileSelection } from '@/shared/contracts/files';

import { resolveImagePreview } from './SocialPublishingPage.Constants';

type SocialPostImagesPanelResolvedProps = {
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  isInteractionBlocked?: boolean;
  interactionTitle?: string;
};

const hasOptionalText = (value: string | null | undefined): value is string =>
  (value?.length ?? 0) > 0;

const imageAltText = (asset: ImageFileSelection): string => {
  if (hasOptionalText(asset.filename)) return asset.filename;
  if (asset.id.length > 0) return asset.id;
  return 'Social image';
};

const imageLabel = (asset: ImageFileSelection): string => {
  if (hasOptionalText(asset.filename)) return asset.filename;
  if (hasOptionalText(asset.filepath)) return asset.filepath;
  return asset.id;
};

function SocialPostImageCard({
  asset,
  handleRemoveImage,
  interactionTitle,
  isInteractionBlocked,
}: Pick<
  SocialPostImagesPanelResolvedProps,
  'handleRemoveImage' | 'interactionTitle' | 'isInteractionBlocked'
> & {
  asset: ImageFileSelection;
}): React.JSX.Element {
  const preview = resolveImagePreview(asset);

  return (
    <div className='rounded-xl border border-border/60 bg-background/40 p-2'>
      {preview.length > 0 ? (
        <div className='overflow-hidden rounded-lg border border-border/50'>
          <img src={preview} alt={imageAltText(asset)} className='h-32 w-full object-cover' loading='lazy' />
        </div>
      ) : (
        <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
          Preview unavailable
        </div>
      )}
      <div className='mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
        <span className='truncate'>{imageLabel(asset)}</span>
        <Button
          type='button'
          size='xs'
          variant='ghost'
          onClick={() => {
            if (isInteractionBlocked === true) return;
            handleRemoveImage(asset.id);
          }}
          disabled={isInteractionBlocked}
          aria-label='Remove image'
          title={isInteractionBlocked === true ? interactionTitle : 'Remove image'}
        >
          <Trash2 className='h-3 w-3' />
        </Button>
      </div>
    </div>
  );
}

function SocialPostImageGrid(
  props: Pick<
    SocialPostImagesPanelResolvedProps,
    'handleRemoveImage' | 'imageAssets' | 'interactionTitle' | 'isInteractionBlocked'
  >
): React.JSX.Element {
  if (props.imageAssets.length === 0) {
    return <div className='text-xs text-muted-foreground'>No images selected yet.</div>;
  }

  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {props.imageAssets.map((asset) => (
        <SocialPostImageCard key={asset.id} asset={asset} {...props} />
      ))}
    </div>
  );
}

const renderSocialPostImagesPanel = (
  props: SocialPostImagesPanelResolvedProps
): React.JSX.Element => (
  <FormSection title='Images' className='space-y-3'>
    <SocialPostImageGrid {...props} />
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        if (props.isInteractionBlocked === true) return;
        props.setShowMediaLibrary(true);
      }}
      disabled={props.isInteractionBlocked}
      title={props.isInteractionBlocked === true ? props.interactionTitle : 'Add images'}
      className='inline-flex items-center gap-2'
    >
      <ImagePlus className='h-4 w-4' />
      Add images
    </Button>
    <MediaLibraryPanel
      open={props.showMediaLibrary}
      onOpenChange={props.setShowMediaLibrary}
      selectionMode='multiple'
      onSelect={(filepaths) => {
        if (props.isInteractionBlocked === true) return;
        props.handleAddImages(filepaths);
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
