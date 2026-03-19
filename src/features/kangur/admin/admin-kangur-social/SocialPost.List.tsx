'use client';

import React from 'react';
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ListPanel,
  SelectSimple,
} from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import {
  formatDatetimeDisplay,
  statusLabel,
} from './AdminKangurSocialPage.Constants';

const PAGE_SIZE = 8;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
] as const;

const buildSearchText = (post: KangurSocialPost): string =>
  [
    post.titlePl,
    post.titleEn,
    post.bodyPl,
    post.bodyEn,
    post.combinedBody,
    post.linkedinPostId,
    post.linkedinUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function SocialPostList({
  posts,
  activePostId,
  isLoading = false,
  onSelectPost,
  onOpenPost,
  onPublishPost,
  onUnpublishPost,
  publishPendingId,
  unpublishPendingId,
  onDeletePost,
}: {
  posts: KangurSocialPost[];
  activePostId: string | null;
  isLoading?: boolean;
  onSelectPost: (id: string) => void;
  onOpenPost?: (id: string) => void;
  onPublishPost?: (post: KangurSocialPost, options?: { skipImages?: boolean }) => void;
  onUnpublishPost?: (post: KangurSocialPost, options?: { keepLocal?: boolean }) => void;
  publishPendingId?: string | null;
  unpublishPendingId?: string | null;
  onDeletePost?: (post: KangurSocialPost) => void;
}): React.JSX.Element {
  const [searchValue, setSearchValue] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTER_OPTIONS)[number]['value']>('all');
  const [page, setPage] = React.useState(1);

  const filteredPosts = React.useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return buildSearchText(post).includes(normalizedSearch);
    });
  }, [posts, searchValue, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const paginatedPosts = React.useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredPosts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPosts, page]);

  const statusCounts = React.useMemo(
    () => ({
      draft: posts.filter((post) => post.status === 'draft').length,
      scheduled: posts.filter((post) => post.status === 'scheduled').length,
      published: posts.filter((post) => post.status === 'published').length,
      failed: posts.filter((post) => post.status === 'failed').length,
    }),
    [posts]
  );

  React.useEffect(() => {
    setPage(1);
  }, [searchValue, statusFilter]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <ListPanel
      header={
        <div className='space-y-3'>
          <div className='space-y-1'>
            <div className='text-sm font-semibold text-foreground'>Social posts</div>
            <div className='text-sm text-muted-foreground'>
              Drafts, scheduled posts, and published LinkedIn updates.
            </div>
          </div>
          <div className='flex flex-wrap gap-2 text-xs'>
            <Badge variant='outline'>{posts.length} total</Badge>
            <Badge variant='outline'>{statusCounts.draft} drafts</Badge>
            <Badge variant='outline'>{statusCounts.scheduled} scheduled</Badge>
            <Badge variant='outline'>{statusCounts.published} published</Badge>
            {statusCounts.failed > 0 ? <Badge variant='outline'>{statusCounts.failed} failed</Badge> : null}
          </div>
          <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_auto]'>
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder='Search titles, copy, LinkedIn IDs, or URLs'
              aria-label='Search social posts'
            />
            <SelectSimple
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(
                  STATUS_FILTER_OPTIONS.some((option) => option.value === value)
                    ? value
                    : 'all'
                )
              }
              options={STATUS_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              ariaLabel='Filter posts by status'
              title='Filter posts by status'
              size='sm'
            />
            <div className='flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              <span>
                {filteredPosts.length === 0
                  ? 'No matches'
                  : `${filteredPosts.length} match${filteredPosts.length === 1 ? '' : 'es'}`}
              </span>
              <span>
                Page {page}/{totalPages}
              </span>
            </div>
          </div>
        </div>
      }
      className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
      contentClassName='space-y-2'
      isLoading={isLoading}
      loadingMessage='Loading social posts...'
    >
      {posts.length === 0 ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
        >
          No social posts yet. Create a new draft to start.
        </Card>
      ) : filteredPosts.length === 0 ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
        >
          No social posts match the current search and status filter.
        </Card>
      ) : (
        <>
          {paginatedPosts.map((post) => {
          const title = post.titlePl || post.titleEn || 'Untitled update';
          const handleOpen = (): void => {
            onSelectPost(post.id);
            onOpenPost?.(post.id);
          };

          return (
            <div
              key={post.id}
              data-testid={`social-post-row-${post.id}`}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm',
                activePostId === post.id && 'border-primary/50 bg-primary/5'
              )}
            >
              <div className='flex min-w-0 flex-1 items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <button
                    type='button'
                    title={title}
                    onClick={handleOpen}
                    aria-label={`Open social post ${title}`}
                    className={[
                      'inline-block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top',
                      'cursor-pointer border-0 bg-transparent p-0 text-left',
                      'text-sm font-semibold text-foreground/90',
                      'hover:text-white/80 hover:underline',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    ].join(' ')}
                  >
                    {title}
                  </button>
                  <div className='space-y-0.5 text-xs text-muted-foreground'>
                    <div>
                      {post.status === 'scheduled'
                        ? `Scheduled: ${formatDatetimeDisplay(post.scheduledAt) || '—'}`
                        : post.publishedAt
                          ? `Published: ${formatDatetimeDisplay(post.publishedAt)}`
                          : 'Draft'}
                    </div>
                    <div>
                      {`Created: ${formatDatetimeDisplay(post.createdAt) || '—'} · Published: ${
                        formatDatetimeDisplay(post.publishedAt) || '—'
                      }`}
                    </div>
                  </div>
                </div>
                {post.status !== 'draft' ? (
                  <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
                    {statusLabel[post.status]}
                  </Badge>
                ) : null}
              </div>
              {onPublishPost ? (
                (() => {
                  const isPublished = post.status === 'published';
                  const canPublish = post.status === 'draft' || post.status === 'failed';
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

                  const publishedAt = formatDatetimeDisplay(post.publishedAt) || '—';
                  const createdAt = formatDatetimeDisplay(post.createdAt) || '—';
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
                              onSelect={() =>
                                window.open(postUrl, '_blank', 'noopener,noreferrer')
                              }
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
                <div className='flex justify-end'>
                  <ActionMenu
                    ariaLabel='Open post actions'
                    triggerClassName='rounded-full border border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-white'
                  >
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onSelect={(event: Event): void => {
                        event.preventDefault();
                        onDeletePost(post);
                      }}
                    >
                      Delete post permanently
                    </DropdownMenuItem>
                  </ActionMenu>
                </div>
              ) : null}
            </div>
          );
        })}
          {totalPages > 1 ? (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm'>
              <div className='text-xs text-muted-foreground'>
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredPosts.length)} of {filteredPosts.length}
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
          ) : null}
        </>
      )}
    </ListPanel>
  );
}
