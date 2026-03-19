'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ListPanel,
} from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { formatDatetimeLocal, statusLabel } from './AdminKangurSocialPage.Constants';

export function SocialPostList({
  posts,
  activePostId,
  onSelectPost,
  onPublishPost,
  onUnpublishPost,
  publishPendingId,
  unpublishPendingId,
  onDeletePost,
}: {
  posts: KangurSocialPost[];
  activePostId: string | null;
  onSelectPost: (id: string) => void;
  onPublishPost?: (post: KangurSocialPost, options?: { skipImages?: boolean }) => void;
  onUnpublishPost?: (post: KangurSocialPost, options?: { keepLocal?: boolean }) => void;
  publishPendingId?: string | null;
  unpublishPendingId?: string | null;
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
                <div className='space-y-0.5 text-xs text-muted-foreground'>
                  <div>
                    {post.status === 'scheduled'
                      ? `Scheduled: ${formatDatetimeLocal(post.scheduledAt) || '—'}`
                      : post.publishedAt
                        ? `Published: ${formatDatetimeLocal(post.publishedAt)}`
                        : 'Draft'}
                  </div>
                  <div>
                    {`Created: ${formatDatetimeLocal(post.createdAt) || '—'} · Published: ${
                      formatDatetimeLocal(post.publishedAt) || '—'
                    }`}
                  </div>
                </div>
              </div>
              {post.status !== 'draft' ? (
                <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
                  {statusLabel[post.status]}
                </Badge>
              ) : null}
            </button>
            {onPublishPost ? (
              (() => {
                const isPublished = post.status === 'published';
                const canPublish =
                  post.status === 'draft' || post.status === 'failed';
                const publishPending = publishPendingId === post.id;
                const unpublishPending = unpublishPendingId === post.id;
                const publishLabel = isPublished
                  ? 'LinkedIn publication details'
                  : 'Publish options';
                const button = (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={publishPending || unpublishPending || (!isPublished && !canPublish)}
                    aria-label={publishLabel}
                    title={publishLabel}
                    className={cn(
                      'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
                      isPublished
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600'
                        : 'text-muted-foreground hover:text-foreground',
                      publishPending && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <span
                      aria-hidden='true'
                      className='text-[9px] font-black uppercase leading-none tracking-tight'
                    >
                      {publishPending ? '...' : 'in'}
                    </span>
                  </Button>
                );

                if (!isPublished) {
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuLabel>Publish options</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => onPublishPost(post)}
                          disabled={publishPending || unpublishPending || !canPublish}
                        >
                          Publish to LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onPublishPost(post, { skipImages: true })}
                          disabled={publishPending || unpublishPending || !canPublish}
                        >
                          Publish without images
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                if (!onUnpublishPost) {
                  return button;
                }

                const publishedAt = formatDatetimeLocal(post.publishedAt) || '—';
                const createdAt = formatDatetimeLocal(post.createdAt) || '—';
                const postId = post.linkedinPostId ?? '—';
                const postUrl = post.linkedinUrl ?? null;

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-72'>
                      <DropdownMenuLabel>LinkedIn publication</DropdownMenuLabel>
                      <div className='space-y-1 px-3 py-2 text-xs text-muted-foreground'>
                        <div>Published: {publishedAt}</div>
                        <div>Created: {createdAt}</div>
                        <div className='break-all'>Post ID: {postId}</div>
                      </div>
                      {postUrl ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => window.open(postUrl, '_blank', 'noopener,noreferrer')}
                          >
                            Open on LinkedIn
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onUnpublishPost(post, { keepLocal: true })}
                        disabled={unpublishPending || !post.linkedinPostId}
                      >
                        Unpublish from LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onUnpublishPost(post)}
                        className='text-destructive focus:text-destructive'
                        disabled={unpublishPending || !post.linkedinPostId}
                      >
                        Unpublish and delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()
            ) : null}
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
