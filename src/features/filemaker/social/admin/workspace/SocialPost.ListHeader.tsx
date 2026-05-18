'use client';

import React from 'react';

import { Badge, Input, SelectSimple } from '@/shared/ui';
import type { SocialPublishingPostListStatus } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import {
  formatMatchCount,
  resolveStatusFilterValue,
  STATUS_FILTER_OPTIONS,
  type SocialPostListStatusCounts,
} from './SocialPost.ListRuntime';

type SocialPostListHeaderProps = {
  page: number;
  searchValue: string;
  setSearchValue: (value: string) => void;
  setStatusFilter: (value: SocialPublishingPostListStatus) => void;
  statusCounts: SocialPostListStatusCounts;
  statusFilter: SocialPublishingPostListStatus;
  totalMatches: number;
  totalPages: number;
};

export function SocialPostListHeader({
  page,
  searchValue,
  setSearchValue,
  setStatusFilter,
  statusCounts,
  statusFilter,
  totalMatches,
  totalPages,
}: SocialPostListHeaderProps): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <div className='space-y-1'>
        <div className='text-sm font-semibold text-foreground'>Social posts</div>
        <div className='text-sm text-muted-foreground'>
          Drafts, scheduled posts, and published updates across configured channels.
        </div>
      </div>
      <div className='flex flex-wrap gap-2 text-xs'>
        <Badge variant='outline'>{totalMatches} total</Badge>
        <Badge variant='outline'>{statusCounts.draft} drafts</Badge>
        <Badge variant='outline'>{statusCounts.scheduled} scheduled</Badge>
        <Badge variant='outline'>{statusCounts.published} published</Badge>
        {statusCounts.failed > 0 ? <Badge variant='outline'>{statusCounts.failed} failed</Badge> : null}
      </div>
      <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_auto]'>
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder='Search titles, copy, publication IDs, or URLs'
          aria-label='Search social posts'
        />
        <SelectSimple
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(resolveStatusFilterValue(value))}
          options={STATUS_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          ariaLabel='Filter posts by status'
          title='Filter posts by status'
          size='sm'
        />
        <div className='flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          <span>{formatMatchCount(totalMatches)}</span>
          <span>
            Page {page}/{totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
