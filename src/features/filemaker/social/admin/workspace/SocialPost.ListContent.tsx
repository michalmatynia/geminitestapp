'use client';

import React from 'react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { Button, Card } from '@/shared/ui';
import type { SocialPublishingPostListStatus } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import { SocialPostListRow } from './SocialPost.ListRow';
import {
  shouldShowEmptyFilterMessage,
  SOCIAL_POST_LIST_PAGE_SIZE,
  type SocialPostListContext,
} from './SocialPost.ListRuntime';

function EmptyPostsMessage({
  searchValue,
  statusFilter,
}: {
  searchValue: string;
  statusFilter: SocialPublishingPostListStatus;
}): React.JSX.Element {
  const message = shouldShowEmptyFilterMessage(searchValue, statusFilter)
    ? 'No social posts match the current search and status filter.'
    : 'No social posts yet. Create a new draft to start.';

  return (
    <Card
      variant='subtle'
      padding='md'
      className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
    >
      {message}
    </Card>
  );
}

function SocialPostListPagination({
  page,
  setPage,
  totalMatches,
  totalPages,
}: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalMatches: number;
  totalPages: number;
}): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm'>
      <div className='text-xs text-muted-foreground'>
        Showing {(page - 1) * SOCIAL_POST_LIST_PAGE_SIZE + 1}-{Math.min(page * SOCIAL_POST_LIST_PAGE_SIZE, totalMatches)} of {totalMatches}
      </div>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function SocialPostListContent({
  context,
  page,
  posts,
  searchValue,
  setPage,
  statusFilter,
  totalMatches,
  totalPages,
}: {
  context: SocialPostListContext;
  page: number;
  posts: SocialPublishingPost[];
  searchValue: string;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  statusFilter: SocialPublishingPostListStatus;
  totalMatches: number;
  totalPages: number;
}): React.JSX.Element {
  if (totalMatches === 0) {
    return <EmptyPostsMessage searchValue={searchValue} statusFilter={statusFilter} />;
  }

  return (
    <>
      {posts.map((post) => (
        <SocialPostListRow key={post.id} context={context} post={post} />
      ))}
      <SocialPostListPagination
        page={page}
        setPage={setPage}
        totalMatches={totalMatches}
        totalPages={totalPages}
      />
    </>
  );
}
