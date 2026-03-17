'use client';

import React from 'react';
import { Badge, Card, ListPanel } from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { formatDatetimeLocal, statusLabel } from './AdminKangurSocialPage.Constants';

export function SocialPostList({
  posts,
  activePostId,
  onSelectPost,
}: {
  posts: KangurSocialPost[];
  activePostId: string | null;
  onSelectPost: (id: string) => void;
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
          <button
            key={post.id}
            type='button'
            onClick={() => onSelectPost(post.id)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm transition hover:bg-background/70',
              activePostId === post.id && 'border-primary/50 bg-primary/5'
            )}
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
            <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
              {statusLabel[post.status]}
            </Badge>
          </button>
        ))
      )}
    </ListPanel>
  );
}
