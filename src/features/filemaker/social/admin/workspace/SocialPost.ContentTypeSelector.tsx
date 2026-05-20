'use client';

import React from 'react';

import { SelectSimple } from '@/shared/ui';
import type { SocialPublishingPostContentType } from '@/shared/contracts/social-publishing-posts';

import { useSocialPostContext } from './SocialPostContext';

const CONTENT_TYPE_OPTIONS: { value: SocialPublishingPostContentType; label: string }[] = [
  { value: 'social-pipeline', label: 'Social Pipeline' },
  { value: 'article-aggregator', label: 'Article Aggregator' },
];

export function SocialPostContentTypeSelector(): React.JSX.Element {
  const { activePost, patchMutation } = useSocialPostContext();
  const contentType = activePost?.contentType ?? 'social-pipeline';
  const isPending = patchMutation.isPending;

  const handleChange = (value: string): void => {
    if (!activePost) return;
    const next = value as SocialPublishingPostContentType;
    if (next === contentType) return;
    patchMutation.mutate({ id: activePost.id, updates: { contentType: next } });
  };

  return (
    <div className='flex items-center gap-2'>
      <span className='text-xs text-muted-foreground shrink-0'>Content type</span>
      <SelectSimple
        value={contentType}
        onValueChange={handleChange}
        options={CONTENT_TYPE_OPTIONS}
        ariaLabel='Content type'
        disabled={isPending || !activePost}
        variant='subtle'
        className='w-48'
      />
    </div>
  );
}
