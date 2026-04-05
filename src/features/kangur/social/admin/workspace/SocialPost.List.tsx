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
import { cn } from '@/shared/utils/ui-utils';
import {
  hasKangurSocialLinkedInPublication,
  hasKangurSocialLinkedInPublicationTarget,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import {
  formatDatetimeDisplay,
  statusLabel,
} from './AdminKangurSocialPage.Constants';
import { KANGUR_ADMIN_CARD_CLASS_NAME } from '@/features/kangur/admin/components/KangurAdminCard';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import { useSocialPostContext } from './SocialPostContext';
import {
  useKangurSocialPostsPage,
  type KangurSocialPostListStatus,
} from '@/features/kangur/social/hooks/useKangurSocialPosts';

const PAGE_SIZE = 8;

const STATUS_FILTER_OPTIONS: Array<{ value: KangurSocialPostListStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
] as const;

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const resolveSocialPostListStatus = (post: KangurSocialPost): KangurSocialPost['status'] =>
  hasKangurSocialLinkedInPublication(post) ? 'published' : post.status;

export function SocialPostList(): React.JSX.Element {
  const {
    activePostId,
    setActivePostId,
    handleOpenPostEditor,
    handleQuickPublishPost,
    handleUnpublishPost,
    publishingPostId,
    unpublishingPostId,
    currentPipelineJob,
    currentGenerationJob,
    currentVisualAnalysisJob,
    setPostToDelete,
    setPostToUnpublish,
    clearDeleteError,
  } = useSocialPostContext();

  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<KangurSocialPostListStatus>('all');
  const [page, setPage] = React.useState(1);
  const postsPageQuery = useKangurSocialPostsPage({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearchValue,
    status: statusFilter,
  });
  const posts = postsPageQuery.data?.posts ?? [];
  const totalMatches = postsPageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const statusCounts = postsPageQuery.data?.statusCounts ?? {
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearchValue, statusFilter]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  React.useEffect(() => {
    if (activePostId) return;
    const firstPostId = posts[0]?.id ?? null;
    if (firstPostId) {
      setActivePostId(firstPostId);
    }
  }, [activePostId, posts, setActivePostId]);

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
              placeholder='Search titles, copy, LinkedIn IDs, or URLs'
              aria-label='Search social posts'
            />
            <SelectSimple
              value={statusFilter}
              onValueChange={(value: string) =>
                setStatusFilter(
                  STATUS_FILTER_OPTIONS.some((option) => option.value === value)
                    ? (value as KangurSocialPostListStatus)
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
                {totalMatches === 0
                  ? 'No matches'
                  : `${totalMatches} match${totalMatches === 1 ? '' : 'es'}`}
              </span>
              <span>
                Page {page}/{totalPages}
              </span>
            </div>
          </div>
        </div>
      }
      className={KANGUR_ADMIN_CARD_CLASS_NAME}
      contentClassName='space-y-2'
      isLoading={postsPageQuery.isLoading}
      loadingMessage='Loading social posts...'
    >
      {totalMatches === 0 ? (
        <Card
          variant='subtle'
          padding='md'
          className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
        >
          {searchValue.trim() || statusFilter !== 'all'
            ? 'No social posts match the current search and status filter.'
            : 'No social posts yet. Create a new draft to start.'}
        </Card>
      ) : (
        <>
          {posts.map((post) => {
          const title = post.titlePl || post.titleEn || 'Untitled update';
          const isActive = activePostId === post.id;
          const listStatus = resolveSocialPostListStatus(post);
          const hasLinkedInPublication = listStatus === 'published';
          const activeVisualAnalysisJob = isActive ? currentVisualAnalysisJob : null;
          const hasVisualAnalysis =
            Boolean(post.visualSummary?.trim()) ||
            (post.visualHighlights?.length ?? 0) > 0 ||
            Boolean(post.visualAnalysisStatus);
          const visualAnalysisStatus =
            activeVisualAnalysisJob?.status ?? post.visualAnalysisStatus ?? null;
          const visualAnalysisError =
            activeVisualAnalysisJob?.failedReason?.trim() ||
            (visualAnalysisStatus === 'failed' ? post.visualAnalysisError?.trim() ?? '' : '') ||
            '';
          const visualHighlightCount = post.visualHighlights?.length ?? 0;
          const visualAnalysisPillStatus = visualAnalysisStatus ?? 'completed';
          const visualAnalysisJobId =
            activeVisualAnalysisJob?.id?.trim() ?? post.visualAnalysisJobId?.trim() ?? '';
          const visualAnalysisPillTitle = [
            activeVisualAnalysisJob?.progress?.message ?? null,
            activeVisualAnalysisJob?.failedReason ?? null,
            !activeVisualAnalysisJob?.failedReason && visualAnalysisStatus === 'failed'
              ? visualAnalysisError
              : null,
            visualAnalysisJobId ? `Queue job: ${visualAnalysisJobId}` : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · ');
          const pipelineSelectionLabel = isActive
            ? `${title} is active for pipeline`
            : `Select ${title} for pipeline`;
          const currentVisualAnalysisJobTitle = [
            currentVisualAnalysisJob?.progress?.message ?? null,
            currentVisualAnalysisJob?.failedReason ?? null,
            currentVisualAnalysisJob?.id ? `Queue job: ${currentVisualAnalysisJob.id}` : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · ');
          const currentGenerationJobTitle = [
            currentGenerationJob?.progress?.message ?? null,
            currentGenerationJob?.failedReason ?? null,
            currentGenerationJob?.id ? `Queue job: ${currentGenerationJob.id}` : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · ');
          const currentPipelineJobTitle = [
            currentPipelineJob?.progress?.message ?? null,
            currentPipelineJob?.failedReason ?? null,
            currentPipelineJob?.id ? `Queue job: ${currentPipelineJob.id}` : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · ');
          const hasBlockingRuntimeSelectionJob =
            isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
            isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
            isSocialRuntimeJobInFlight(currentPipelineJob?.status);
          const isSelectionBlocked = !isActive && hasBlockingRuntimeSelectionJob;
          const isDeleteBlocked = isActive && hasBlockingRuntimeSelectionJob;
          const handleOpen = (): void => {
            if (isSelectionBlocked) {
              return;
            }
            setActivePostId(post.id);
            handleOpenPostEditor?.(post.id);
          };

          return (
            <div
              key={post.id}
              data-testid={`social-post-row-${post.id}`}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm',
                isActive && 'border-primary/50 bg-primary/5'
              )}
            >
              <Button
                type='button'
                variant={isActive ? 'secondary' : 'outline'}
                size='xs'
                onClick={() => setActivePostId(post.id)}
                disabled={isSelectionBlocked}
                aria-pressed={isActive}
                aria-label={pipelineSelectionLabel}
                title={
                  isSelectionBlocked
                    ? 'Wait for the current Social runtime job to finish.'
                    : pipelineSelectionLabel
                }
                className='shrink-0'
              >
                {isActive ? 'Active' : 'Select'}
              </Button>

              <div className='flex min-w-0 flex-1 items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <button
                    type='button'
                    title={
                      isSelectionBlocked
                        ? 'Wait for the current Social runtime job to finish.'
                        : title
                    }
                    onClick={handleOpen}
                    aria-label={`Open social post ${title}`}
                    disabled={isSelectionBlocked}
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
                      {hasLinkedInPublication
                        ? `Published on LinkedIn: ${
                            formatDatetimeDisplay(post.publishedAt) || 'date unavailable'
                          }`
                        : post.status === 'scheduled'
                        ? `Scheduled: ${formatDatetimeDisplay(post.scheduledAt) || '—'}`
                        : post.status === 'failed'
                          ? 'Publish failed'
                          : 'Draft'}
                    </div>
                    <div>
                      {`Created: ${formatDatetimeDisplay(post.createdAt) || '—'} · Published: ${
                        formatDatetimeDisplay(post.publishedAt) || '—'
                      }`}
                    </div>
                    {hasVisualAnalysis ? (
                      <div className='mt-1 flex flex-wrap items-center gap-2'>
                        <SocialJobStatusPill
                          status={visualAnalysisPillStatus}
                          label='Image analysis'
                          className='text-[10px]'
                          title={visualAnalysisPillTitle || undefined}
                        />
                        {post.visualAnalysisUpdatedAt ? (
                          <span>
                            Analyzed {formatDatetimeDisplay(post.visualAnalysisUpdatedAt) || '—'}
                          </span>
                        ) : null}
                        {post.visualAnalysisModelId ? (
                          <span>Model: {post.visualAnalysisModelId}</span>
                        ) : null}
                        {visualAnalysisJobId ? (
                          <span>Job: {visualAnalysisJobId}</span>
                        ) : null}
                        {visualHighlightCount > 0 ? (
                          <span>
                            {visualHighlightCount} highlight
                            {visualHighlightCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        {visualAnalysisError ? (
                          <span>Failure: {visualAnalysisError}</span>
                        ) : null}
                      </div>
                    ) : null}
                    {isActive &&
                    (currentVisualAnalysisJob?.status ||
                      currentGenerationJob?.status ||
                      currentPipelineJob?.status) ? (
                      <div className='mt-1 flex flex-wrap items-center gap-2'>
                        <span className='font-medium text-foreground/80'>Runtime jobs:</span>
                        {currentVisualAnalysisJob?.status ? (
                          <SocialJobStatusPill
                            status={currentVisualAnalysisJob.status}
                            label='Image analysis'
                            className='text-[10px]'
                            title={currentVisualAnalysisJobTitle || undefined}
                          />
                        ) : null}
                        {currentGenerationJob?.status ? (
                          <SocialJobStatusPill
                            status={currentGenerationJob.status}
                            label='Generate post'
                            className='text-[10px]'
                            title={currentGenerationJobTitle || undefined}
                          />
                        ) : null}
                        {currentPipelineJob?.status ? (
                          <SocialJobStatusPill
                            status={currentPipelineJob.status}
                            label='Full pipeline'
                            className='text-[10px]'
                            title={currentPipelineJobTitle || undefined}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                {listStatus !== 'draft' ? (
                  <Badge variant={listStatus === 'published' ? 'secondary' : 'outline'}>
                    {statusLabel[listStatus]}
                  </Badge>
                ) : null}
              </div>
              
              {(() => {
                const isPublished = hasLinkedInPublication;
                const canPublish = listStatus === 'draft' || listStatus === 'failed';
                const publishPending = publishingPostId === post.id;
                const unpublishPending = unpublishingPostId === post.id;
                const hasBlockingRuntimeJob =
                  isActive &&
                  (isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
                    isSocialRuntimeJobInFlight(currentPipelineJob?.status));
                const runtimeLockTitle = 'Wait for the current Social runtime job to finish.';
                const publishLabel = isPublished
                  ? hasBlockingRuntimeJob
                    ? runtimeLockTitle
                    : 'LinkedIn publication details'
                  : hasBlockingRuntimeJob
                    ? runtimeLockTitle
                    : 'Publish options';
                const publishToLinkedInTitle = hasBlockingRuntimeJob
                  ? runtimeLockTitle
                  : 'Publish to LinkedIn';
                const publishWithoutImagesTitle = hasBlockingRuntimeJob
                  ? runtimeLockTitle
                  : 'Publish without images';
                const unpublishTitle = hasBlockingRuntimeJob
                  ? runtimeLockTitle
                  : 'Unpublish from LinkedIn';
                const unpublishAndDeleteTitle = hasBlockingRuntimeJob
                  ? runtimeLockTitle
                  : 'Unpublish and delete';
                const button = (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={
                      publishPending ||
                      unpublishPending ||
                      hasBlockingRuntimeJob ||
                      (!isPublished && !canPublish)
                    }
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
                          onSelect={() => {
                            void handleQuickPublishPost(post.id, 'published');
                          }}
                          disabled={
                            publishPending ||
                            unpublishPending ||
                            hasBlockingRuntimeJob ||
                            !canPublish
                          }
                          title={publishToLinkedInTitle}
                        >
                          Publish to LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => {
                            void handleQuickPublishPost(post.id, 'published', { skipImages: true });
                          }}
                          disabled={
                            publishPending ||
                            unpublishPending ||
                            hasBlockingRuntimeJob ||
                            !canPublish
                          }
                          title={publishWithoutImagesTitle}
                        >
                          Publish without images
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
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
                        onSelect={() => {
                          void handleUnpublishPost(post.id, { keepLocal: true });
                        }}
                        disabled={
                          unpublishPending ||
                          hasBlockingRuntimeJob ||
                          !hasKangurSocialLinkedInPublicationTarget(post)
                        }
                        title={unpublishTitle}
                      >
                        Unpublish from LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setPostToUnpublish(post)}
                        className='text-destructive focus:text-destructive'
                        disabled={
                          unpublishPending ||
                          hasBlockingRuntimeJob ||
                          !hasKangurSocialLinkedInPublicationTarget(post)
                        }
                        title={unpublishAndDeleteTitle}
                      >
                        Unpublish and delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
              
              {!hasLinkedInPublication && post.status === 'draft' && (
                <div className='flex justify-end'>
                  <ActionMenu
                    ariaLabel='Open post actions'
                    triggerClassName='rounded-full border border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-white'
                  >
                    <DropdownMenuItem
                      onSelect={(event: Event): void => {
                        event.preventDefault();
                        handleOpen();
                      }}
                      disabled={isSelectionBlocked}
                      title={
                        isSelectionBlocked
                          ? 'Wait for the current Social runtime job to finish.'
                          : 'Edit post'
                      }
                    >
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onSelect={(event: Event): void => {
                        event.preventDefault();
                        clearDeleteError();
                        setPostToDelete(post);
                      }}
                      disabled={isDeleteBlocked}
                      title={
                        isDeleteBlocked
                          ? 'Wait for the current Social runtime job to finish.'
                          : 'Delete post permanently'
                      }
                    >
                      Delete post permanently
                    </DropdownMenuItem>
                  </ActionMenu>
                </div>
              )}
            </div>
          );
        })}
          {totalPages > 1 ? (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 text-sm'>
              <div className='text-xs text-muted-foreground'>
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalMatches)} of {totalMatches}
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
