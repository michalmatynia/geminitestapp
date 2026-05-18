'use client';

import React from 'react';

import { Button } from '@/shared/ui';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import { resolveImagePreview } from './SocialPublishingPage.Constants';
import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';
import { hasText } from './SocialPost.VisualsRuntime';

export type SocialImageAddonCardProps = {
  addon: SocialPublishingImageAddon;
  allAddons: SocialPublishingImageAddon[];
  isInteractionBlocked: boolean;
  isSelected: boolean;
  onRemove: (id: string) => void;
  onSelect: (addon: SocialPublishingImageAddon) => void;
  personaNameById: Map<string, string>;
  title?: string;
};

const findPreviousAddon = (
  addon: SocialPublishingImageAddon,
  allAddons: SocialPublishingImageAddon[]
): SocialPublishingImageAddon | null => {
  if (!hasText(addon.previousAddonId)) return null;
  return allAddons.find((candidate) => candidate.id === addon.previousAddonId) ?? null;
};

const addonAltText = (title: string, fallback: string): string => {
  if (title.length > 0) return title;
  return fallback;
};

function AddonPreviewImage({
  alt,
  className,
  preview,
}: {
  alt: string;
  className: string;
  preview: string;
}): React.JSX.Element {
  return <img src={preview} alt={alt} className={className} loading='lazy' />;
}

function AddonComparisonPreview({
  addon,
  preview,
  previousPreview,
}: {
  addon: SocialPublishingImageAddon;
  preview: string;
  previousPreview: string;
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-2 gap-1'>
      <div className='space-y-1'>
        <div className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>Before</div>
        <div className='overflow-hidden rounded-lg border border-border/50'>
          <AddonPreviewImage
            preview={previousPreview}
            alt={`Before: ${addonAltText(addon.title, 'previous capture')}`}
            className='h-28 w-full object-cover opacity-75'
          />
        </div>
      </div>
      <div className='space-y-1'>
        <div className='text-[10px] font-medium uppercase tracking-wide text-primary'>After</div>
        <div className='overflow-hidden rounded-lg border border-primary/40'>
          <AddonPreviewImage
            preview={preview}
            alt={addonAltText(addon.title, 'Social add-on')}
            className='h-28 w-full object-cover'
          />
        </div>
      </div>
    </div>
  );
}

function AddonSinglePreview({
  addon,
  preview,
}: {
  addon: SocialPublishingImageAddon;
  preview: string;
}): React.JSX.Element {
  return (
    <div className='overflow-hidden rounded-lg border border-border/50'>
      <AddonPreviewImage
        preview={preview}
        alt={addonAltText(addon.title, 'Social add-on')}
        className='h-32 w-full object-cover'
      />
    </div>
  );
}

function AddonPreview({
  addon,
  allAddons,
}: {
  addon: SocialPublishingImageAddon;
  allAddons: SocialPublishingImageAddon[];
}): React.JSX.Element {
  const preview = resolveImagePreview(addon.imageAsset);
  const previousAddon = findPreviousAddon(addon, allAddons);
  const previousPreview = previousAddon === null ? '' : resolveImagePreview(previousAddon.imageAsset);

  if (previousPreview.length > 0 && preview.length > 0) {
    return <AddonComparisonPreview addon={addon} preview={preview} previousPreview={previousPreview} />;
  }

  return <AddonSinglePreview addon={addon} preview={preview} />;
}

function AddonCaptureLabels({
  addon,
  personaNameById,
}: {
  addon: SocialPublishingImageAddon;
  personaNameById: Map<string, string>;
}): React.JSX.Element | null {
  const labels = getSocialPostAddonCaptureDetailLabels(addon, { personaNameById });
  if (labels.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-1 pt-1 text-[9px] text-muted-foreground'>
      {labels.map((label) => (
        <span key={`${addon.id}-${label}`} className='rounded-full border border-border/50 px-1.5 py-0.5'>
          {label}
        </span>
      ))}
    </div>
  );
}

function AddonActionButton({
  addon,
  isInteractionBlocked,
  isSelected,
  onRemove,
  onSelect,
  title,
}: SocialImageAddonCardProps): React.JSX.Element {
  const handleClick = (): void => {
    if (isSelected) {
      onRemove(addon.id);
      return;
    }

    onSelect(addon);
  };

  return (
    <Button
      type='button'
      variant={isSelected ? 'secondary' : 'outline'}
      size='xs'
      disabled={isInteractionBlocked}
      title={title}
      onClick={handleClick}
    >
      {isSelected ? 'Remove' : 'Select'}
    </Button>
  );
}

export function SocialImageAddonCard(props: SocialImageAddonCardProps): React.JSX.Element {
  const { addon, allAddons, personaNameById } = props;

  return (
    <div className='rounded-xl border border-border/60 bg-background/40 p-2'>
      <AddonPreview addon={addon} allAddons={allAddons} />
      <div className='mt-2 flex items-center justify-between gap-2'>
        <div className='min-w-0 flex-1 space-y-0.5'>
          <div className='truncate text-[10px] font-medium text-foreground/90'>{addon.title}</div>
          <div className='truncate text-[9px] text-muted-foreground'>
            {hasText(addon.createdAt) ? new Date(addon.createdAt).toLocaleDateString() : ''}
          </div>
          <AddonCaptureLabels addon={addon} personaNameById={personaNameById} />
        </div>
        <AddonActionButton {...props} />
      </div>
    </div>
  );
}
