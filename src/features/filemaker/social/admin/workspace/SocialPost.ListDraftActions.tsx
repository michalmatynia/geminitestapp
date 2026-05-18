'use client';

import React from 'react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import {
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import {
  SOCIAL_POST_RUNTIME_LOCK_TITLE,
  type SocialPostListContext,
  type SocialPostListRowState,
} from './SocialPost.ListRuntime';

export function SocialPostListDraftActions({
  context,
  onOpen,
  post,
  rowState,
}: {
  context: SocialPostListContext;
  onOpen: () => void;
  post: SocialPublishingPost;
  rowState: SocialPostListRowState;
}): React.JSX.Element | null {
  if (rowState.hasPublication || post.status !== 'draft') return null;

  return (
    <div className='flex justify-end'>
      <ActionMenu
        ariaLabel='Open post actions'
        triggerClassName='rounded-full border border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-white'
      >
        <DropdownMenuItem
          onSelect={(event: Event): void => {
            event.preventDefault();
            onOpen();
          }}
          disabled={rowState.isSelectionBlocked}
          title={rowState.isSelectionBlocked ? SOCIAL_POST_RUNTIME_LOCK_TITLE : 'Edit post'}
        >
          Edit post
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onSelect={(event: Event): void => {
            event.preventDefault();
            if (rowState.isDeleteBlocked) return;
            context.clearDeleteError();
            context.setPostToDelete(post);
          }}
          disabled={rowState.isDeleteBlocked}
          title={rowState.isDeleteBlocked ? SOCIAL_POST_RUNTIME_LOCK_TITLE : 'Delete post permanently'}
        >
          Delete post permanently
        </DropdownMenuItem>
      </ActionMenu>
    </div>
  );
}
