'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Badge, Button, Card, ListPanel } from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { formatDatetimeLocal, statusLabel } from './AdminKangurSocialPage.Constants';

export function SocialPostList({
  posts,
  activePostId,
  onSelectPost,
  onDeletePost,
}: {
  posts: KangurSocialPost[];
  activePostId: string | null;
  onSelectPost: (id: string) => void;
  onDeletePost?: (post: KangurSocialPost) => void;
}): React.JSX.Element {
  return (
    <ListPanel
      header={
        <div>
          <div className='text-sm font-semibold text-foreground'>Social posts</div>
          <div className='text-sm text-muted-foreground'>
            Drafts, scheduled posts, and published LinkedIn updates.
          </div>
        </div>
      }
      className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
      contentClassName='space-y-2'
    >
      {posts.length === 0 ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
        >
          No social posts yet. Create a new draft to start.
        </Card>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm transition hover:bg-background/70',
              activePostId === post.id && 'border-primary/50 bg-primary/5'
            )}
          >
            <button
              type='button'
              onClick={() => onSelectPost(post.id)}
              className='flex min-w-0 flex-1 items-center justify-between gap-3 text-left'
            >
              <div>
                <div className='font-semibold text-foreground'>
                  {post.titlePl || post.titleEn || 'Untitled update'}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {post.status === 'scheduled'
                    ? `Scheduled: ${formatDatetimeLocal(post.scheduledAt) || '—'}`
                    : post.publishedAt
                      ? `Published: ${formatDatetimeLocal(post.publishedAt)}`
                      : 'Draft'}
                </div>
              </div>
              {post.status !== 'draft' ? (
                <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
                  {statusLabel[post.status]}
                </Badge>
              ) : null}
            </button>
            {post.status === 'draft' && onDeletePost ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => onDeletePost(post)}
                aria-label='Delete draft'
                title='Delete draft'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            ) : null}
          </div>
        ))
      )}
    </ListPanel>
  );
}
