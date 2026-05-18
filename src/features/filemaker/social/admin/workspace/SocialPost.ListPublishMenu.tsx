'use client';

import React from 'react';
import { Send } from 'lucide-react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { hasSocialPublishingPublicationTarget } from '@/shared/contracts/social-publishing-posts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { cn } from '@/shared/utils/ui-utils';
import { formatDatetimeDisplay } from './SocialPublishingPage.Constants';
import {
  hasBlockingPublicationJob,
  SOCIAL_POST_RUNTIME_LOCK_TITLE,
  type SocialPostListContext,
  type SocialPostListRowState,
} from './SocialPost.ListRuntime';
import { hasText } from './SocialPost.VisualsRuntime';

type PublishMenuProps = {
  context: SocialPostListContext;
  post: SocialPublishingPost;
  rowState: SocialPostListRowState;
};

type PublishActionState = {
  canPublish: boolean;
  hasBlockingRuntimeJob: boolean;
  isPublished: boolean;
  publishPending: boolean;
  unpublishPending: boolean;
};

const publishButtonLabel = (state: PublishActionState): string => {
  if (state.hasBlockingRuntimeJob) return SOCIAL_POST_RUNTIME_LOCK_TITLE;
  if (state.isPublished) return 'Publication details';
  return 'Publish options';
};

const runtimeLockedTitle = (blocked: boolean, title: string): string => {
  if (blocked) return SOCIAL_POST_RUNTIME_LOCK_TITLE;
  return title;
};

const publishButtonClass = (state: PublishActionState): string =>
  cn(
    'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
    state.isPublished
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600'
      : 'text-muted-foreground hover:text-foreground',
    state.publishPending && 'cursor-not-allowed opacity-60'
  );

const isPublishButtonDisabled = (state: PublishActionState): boolean =>
  state.publishPending ||
  state.unpublishPending ||
  state.hasBlockingRuntimeJob ||
  (!state.isPublished && !state.canPublish);

const buildPublishActionStateForPost = ({
  context,
  post,
  rowState,
}: PublishMenuProps): PublishActionState => ({
  canPublish: rowState.listStatus === 'draft' || rowState.listStatus === 'failed',
  hasBlockingRuntimeJob: hasBlockingPublicationJob(context, rowState.isActive),
  isPublished: rowState.hasPublication,
  publishPending: context.publishingPostId === post.id,
  unpublishPending: context.unpublishingPostId === post.id,
});

function PublishMenuButton({
  state,
}: {
  state: PublishActionState;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      disabled={isPublishButtonDisabled(state)}
      aria-label={publishButtonLabel(state)}
      title={publishButtonLabel(state)}
      className={publishButtonClass(state)}
    >
      {state.publishPending ? (
        <span aria-hidden='true' className='text-[9px] font-black uppercase leading-none tracking-tight'>
          ...
        </span>
      ) : (
        <Send aria-hidden='true' className='h-3.5 w-3.5' />
      )}
    </Button>
  );
}

function DraftPublishMenu({
  context,
  post,
  state,
}: {
  context: SocialPostListContext;
  post: SocialPublishingPost;
  state: PublishActionState;
}): React.JSX.Element {
  const publishNowTitle = runtimeLockedTitle(state.hasBlockingRuntimeJob, 'Publish now');
  const publishWithoutImagesTitle = runtimeLockedTitle(
    state.hasBlockingRuntimeJob,
    'Publish without images'
  );

  return (
    <DropdownMenuContent align='end' className='w-56'>
      <DropdownMenuLabel>Publish options</DropdownMenuLabel>
      <DropdownMenuItem
        onSelect={() => {
          void context.handleQuickPublishPost(post.id, 'published');
        }}
        disabled={isPublishButtonDisabled(state)}
        title={publishNowTitle}
      >
        Publish now
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          void context.handleQuickPublishPost(post.id, 'published', { skipImages: true });
        }}
        disabled={isPublishButtonDisabled(state)}
        title={publishWithoutImagesTitle}
      >
        Publish without images
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function PublishedDetails({
  post,
}: {
  post: SocialPublishingPost;
}): React.JSX.Element {
  return (
    <div className='space-y-1 px-3 py-2 text-xs text-muted-foreground'>
      <div>Published: {displayDate(post.publishedAt)}</div>
      <div>Created: {displayDate(post.createdAt)}</div>
      <div className='break-all'>Post ID: {post.publishedPostId ?? '-'}</div>
    </div>
  );
}

const displayDate = (value: string | null | undefined): string => {
  const formatted = formatDatetimeDisplay(value);
  if (formatted.length > 0) return formatted;
  return '-';
};

function OpenPublishedPostAction({
  post,
}: {
  post: SocialPublishingPost;
}): React.JSX.Element | null {
  const postUrl = post.publishedUrl;
  if (!hasText(postUrl)) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          window.open(postUrl, '_blank', 'noopener,noreferrer');
        }}
      >
        Open published post
      </DropdownMenuItem>
    </>
  );
}

function PublishedPostMenu({
  context,
  post,
  state,
}: {
  context: SocialPostListContext;
  post: SocialPublishingPost;
  state: PublishActionState;
}): React.JSX.Element {
  const canUnpublish = hasSocialPublishingPublicationTarget(post);

  return (
    <DropdownMenuContent align='end' className='w-72'>
      <DropdownMenuLabel>Publication</DropdownMenuLabel>
      <PublishedDetails post={post} />
      <OpenPublishedPostAction post={post} />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          void context.handleUnpublishPost(post.id, { keepLocal: true });
        }}
        disabled={state.unpublishPending || state.hasBlockingRuntimeJob || !canUnpublish}
        title={runtimeLockedTitle(state.hasBlockingRuntimeJob, 'Unpublish')}
      >
        Unpublish
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => context.setPostToUnpublish(post)}
        className='text-destructive focus:text-destructive'
        disabled={state.unpublishPending || state.hasBlockingRuntimeJob || !canUnpublish}
        title={runtimeLockedTitle(state.hasBlockingRuntimeJob, 'Unpublish and delete')}
      >
        Unpublish and delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function SocialPostListPublishMenu(props: PublishMenuProps): React.JSX.Element {
  const state = buildPublishActionStateForPost(props);
  const button = <PublishMenuButton state={state} />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      {state.isPublished ? (
        <PublishedPostMenu context={props.context} post={props.post} state={state} />
      ) : (
        <DraftPublishMenu context={props.context} post={props.post} state={state} />
      )}
    </DropdownMenu>
  );
}
