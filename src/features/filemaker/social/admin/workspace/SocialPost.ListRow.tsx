'use client';

import React from 'react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/utils/ui-utils';
import {
  formatDatetimeDisplay,
  statusLabel,
} from './SocialPublishingPage.Constants';
import { SocialPostListDraftActions } from './SocialPost.ListDraftActions';
import { SocialPostListPublishMenu } from './SocialPost.ListPublishMenu';
import {
  buildSocialPostListRowState,
  SOCIAL_POST_RUNTIME_LOCK_TITLE,
  type SocialPostListContext,
  type SocialPostListRowState,
} from './SocialPost.ListRuntime';
import { SocialPostListVisualAnalysis } from './SocialPost.ListVisualAnalysis';

type SocialPostListRowProps = {
  context: SocialPostListContext;
  post: SocialPublishingPost;
};

const displayOrDash = (value: string): string => {
  if (value.length > 0) return value;
  return '-';
};

const displayPublishedDate = (value: string | null): string => {
  const formatted = formatDatetimeDisplay(value);
  if (formatted.length > 0) return formatted;
  return 'date unavailable';
};

const primaryStatusText = (
  post: SocialPublishingPost,
  rowState: SocialPostListRowState
): string => {
  if (rowState.hasPublication) return `Published: ${displayPublishedDate(post.publishedAt)}`;
  if (post.status === 'scheduled') return `Scheduled: ${displayOrDash(formatDatetimeDisplay(post.scheduledAt))}`;
  if (post.status === 'failed') return 'Publish failed';
  return 'Draft';
};

const createdPublishedText = (post: SocialPublishingPost): string =>
  `Created: ${displayOrDash(formatDatetimeDisplay(post.createdAt))} · Published: ${displayOrDash(formatDatetimeDisplay(post.publishedAt))}`;

const resolveInteractiveTitle = (blocked: boolean, fallbackTitle: string): string => {
  if (blocked) return SOCIAL_POST_RUNTIME_LOCK_TITLE;
  return fallbackTitle;
};

function PipelineSelectButton({
  context,
  post,
  rowState,
}: SocialPostListRowProps & {
  rowState: SocialPostListRowState;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant={rowState.isActive ? 'secondary' : 'outline'}
      size='xs'
      onClick={() => context.setActivePostId(post.id)}
      disabled={rowState.isSelectionBlocked}
      aria-pressed={rowState.isActive}
      aria-label={rowState.pipelineSelectionLabel}
      title={resolveInteractiveTitle(rowState.isSelectionBlocked, rowState.pipelineSelectionLabel)}
      className='shrink-0'
    >
      {rowState.isActive ? 'Active' : 'Select'}
    </Button>
  );
}

function PostTitleButton({
  onOpen,
  rowState,
}: {
  onOpen: () => void;
  rowState: SocialPostListRowState;
}): React.JSX.Element {
  return (
    <button
      type='button'
      title={resolveInteractiveTitle(rowState.isSelectionBlocked, rowState.title)}
      onClick={onOpen}
      aria-label={`Open social post ${rowState.title}`}
      disabled={rowState.isSelectionBlocked}
      className={[
        'inline-block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top',
        'cursor-pointer border-0 bg-transparent p-0 text-left',
        'text-sm font-semibold text-foreground/90',
        'hover:text-white/80 hover:underline',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      ].join(' ')}
    >
      {rowState.title}
    </button>
  );
}

function PostStatusBadge({ rowState }: { rowState: SocialPostListRowState }): React.JSX.Element | null {
  if (rowState.listStatus === 'draft') return null;
  return (
    <Badge variant={rowState.listStatus === 'published' ? 'secondary' : 'outline'}>
      {statusLabel[rowState.listStatus]}
    </Badge>
  );
}

function PostSummary({
  context,
  onOpen,
  post,
  rowState,
}: SocialPostListRowProps & {
  onOpen: () => void;
  rowState: SocialPostListRowState;
}): React.JSX.Element {
  return (
    <div className='flex min-w-0 flex-1 items-center justify-between gap-3'>
      <div className='min-w-0'>
        <PostTitleButton onOpen={onOpen} rowState={rowState} />
        <div className='space-y-0.5 text-xs text-muted-foreground'>
          <div>{primaryStatusText(post, rowState)}</div>
          <div>{createdPublishedText(post)}</div>
          <SocialPostListVisualAnalysis context={context} isActive={rowState.isActive} post={post} />
        </div>
      </div>
      <PostStatusBadge rowState={rowState} />
    </div>
  );
}

export function SocialPostListRow({ context, post }: SocialPostListRowProps): React.JSX.Element {
  const rowState = buildSocialPostListRowState({ context, post });
  const handleOpen = (): void => {
    if (rowState.isSelectionBlocked) return;
    context.setActivePostId(post.id);
    context.handleOpenPostEditor(post.id);
  };

  return (
    <div
      data-testid={`social-post-row-${post.id}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm',
        rowState.isActive && 'border-primary/50 bg-primary/5'
      )}
    >
      <PipelineSelectButton context={context} post={post} rowState={rowState} />
      <PostSummary context={context} onOpen={handleOpen} post={post} rowState={rowState} />
      <SocialPostListPublishMenu context={context} post={post} rowState={rowState} />
      <SocialPostListDraftActions
        context={context}
        onOpen={handleOpen}
        post={post}
        rowState={rowState}
      />
    </div>
  );
}
