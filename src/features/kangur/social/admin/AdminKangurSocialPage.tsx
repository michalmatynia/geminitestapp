'use client';

import Link from 'next/link';
import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import {
  Breadcrumbs,
  Button,
  LoadingState,
} from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';

import { AdminKangurSocialSettingsModal } from './workspace/AdminKangurSocialSettingsModal';
import { SocialPostList } from './workspace/SocialPost.List';
import { SocialPostEditorModal } from './workspace/SocialPost.EditorModal';
import { SocialPostPipeline } from './workspace/SocialPost.Pipeline';
import { SocialPostPlaywrightCaptureModal } from './workspace/SocialPost.PlaywrightCaptureModal';
import { SocialPostVisualAnalysisModal } from './workspace/SocialPost.VisualAnalysisModal';
import { KangurSocialPipelineQueuePanel } from './workspace/KangurSocialPipelineQueuePanel';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { SocialPostProvider, useSocialPostContext } from './workspace/SocialPostContext';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const isBatchCaptureJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  return normalized === 'queued' || normalized === 'running';
};

function AdminKangurSocialPageContent(): React.JSX.Element {
  const {
    activePost,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPostEditorModalOpen,
    setIsPostEditorModalOpen,
    isVisualAnalysisModalOpen,
    isProgrammablePlaywrightModalOpen,
    postToDelete,
    setPostToDelete,
    postToUnpublish,
    setPostToUnpublish,
    deleteError,
    clearDeleteError,
    deleteMutation,
    unpublishMutation,
    currentPipelineJob,
    currentGenerationJob,
    currentVisualAnalysisJob,
    batchCaptureJob,
    captureOnlyBatchCaptureJob,
    programmableCaptureBatchCaptureJob,
    handleCreateDraft,
    handleDeletePost,
    handleUnpublishPost,
  } = useSocialPostContext();
  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Social' },
  ];

  React.useEffect(() => {
    if (!activePost) {
      setIsPostEditorModalOpen(false);
    }
  }, [activePost]);

  const handleCreateDraftAndOpen = React.useCallback(async (): Promise<void> => {
    const created = await handleCreateDraft();
    if (created) {
      setIsPostEditorModalOpen(true);
    }
  }, [handleCreateDraft]);
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const activeBatchCaptureJob =
    (isBatchCaptureJobInFlight(captureOnlyBatchCaptureJob?.status)
      ? captureOnlyBatchCaptureJob
      : isBatchCaptureJobInFlight(programmableCaptureBatchCaptureJob?.status)
        ? programmableCaptureBatchCaptureJob
        : isBatchCaptureJobInFlight(batchCaptureJob?.status)
          ? batchCaptureJob
          : null) ?? null;
  const activeBatchCaptureSummary =
    activeBatchCaptureJob?.progress
      ? `Playwright capture: ${activeBatchCaptureJob.progress.completedCount} captured, ${activeBatchCaptureJob.progress.remainingCount} left of ${activeBatchCaptureJob.progress.totalCount}${
          activeBatchCaptureJob.progress.failureCount > 0
            ? `. ${activeBatchCaptureJob.progress.failureCount} failed.`
            : '.'
        }`
      : null;
  const isDeleteConfirmBlocked =
    Boolean(postToDelete?.id) && postToDelete?.id === activePost?.id && hasBlockingRuntimeJob;
  const isUnpublishConfirmBlocked =
    Boolean(postToUnpublish?.id) && postToUnpublish?.id === activePost?.id && hasBlockingRuntimeJob;
  const runtimeConfirmBlockMessage =
    'Wait for the current Social runtime job to finish before confirming this action.';

  return (
    <KangurAdminContentShell
      title='StudiQ Social'
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
        </div>
      }
      breadcrumbs={breadcrumbs}
      headerLayout='stacked'
      headerFooterSpacing='flush'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      showBreadcrumbs={false}
      headerActions={
        <>
          {activeBatchCaptureSummary ? (
            <div className='mr-2 text-xs text-muted-foreground'>
              {activeBatchCaptureSummary}
            </div>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleCreateDraftAndOpen();
            }}
            disabled={hasBlockingRuntimeJob}
            title={
              hasBlockingRuntimeJob
                ? 'Wait for the current Social runtime job to finish.'
                : 'New draft'
            }
          >
            New draft
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/brain?tab=routing'>AI Brain routing</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/integrations'>Integrations</Link>
          </Button>
          <div className='ml-auto'>
            <Button
              variant={isSettingsModalOpen ? 'default' : 'outline'}
              size='sm'
              aria-haspopup='dialog'
              aria-expanded={isSettingsModalOpen}
              onClick={() => setIsSettingsModalOpen(true)}
            >
              Settings
            </Button>
          </div>
        </>
      }
    >
      <div
        className={cn(
          KANGUR_GRID_ROOMY_CLASSNAME,
          'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'
        )}
      >
        <SocialPostList />

        <div className='space-y-6'>
          {activePost ? (
            <SocialPostPipeline />
          ) : (
            <LoadingState
              message='Select a social post to open its pipeline workspace.'
              size='lg'
              className='min-h-[240px] rounded-2xl border border-border/60 bg-card/40 shadow-sm'
            />
          )}

          <KangurSocialPipelineQueuePanel variant='compact' />

          {activePost?.status === 'failed' && activePost.publishError ? (
            <KangurAdminCard>
              <div className='space-y-2'>
                <div className='text-sm font-semibold text-foreground'>Publish error</div>
                <div className='text-sm text-muted-foreground whitespace-pre-wrap'>
                  {activePost.publishError}
                </div>
              </div>
            </KangurAdminCard>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={(): void => {
          setPostToDelete(null);
          clearDeleteError();
        }}
        onConfirm={async (): Promise<void> => {
          if (!postToDelete) return;
          await handleDeletePost(postToDelete.id);
        }}
        title='Delete draft'
        message={
          <div className='space-y-2'>
            <div>
              {`Delete draft "${postToDelete?.titlePl || postToDelete?.titleEn || 'Untitled update'}"? This action cannot be undone.`}
            </div>
            {deleteError ? (
              <div className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
                {deleteError}
              </div>
            ) : null}
            {isDeleteConfirmBlocked ? (
              <div className='rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
                {runtimeConfirmBlockMessage}
              </div>
            ) : null}
          </div>
        }
        confirmText='Delete'
        isDangerous={true}
        loading={deleteMutation.isPending}
        confirmDisabled={isDeleteConfirmBlocked}
      />

      {isPostEditorModalOpen ? (
        <SocialPostEditorModal
          isOpen={true}
          onClose={() => setIsPostEditorModalOpen(false)}
        />
      ) : null}
      {isProgrammablePlaywrightModalOpen ? <SocialPostPlaywrightCaptureModal /> : null}
      {isVisualAnalysisModalOpen ? <SocialPostVisualAnalysisModal /> : null}

      <ConfirmModal
        isOpen={Boolean(postToUnpublish)}
        onClose={(): void => setPostToUnpublish(null)}
        onConfirm={async (): Promise<void> => {
          if (!postToUnpublish) return;
          await handleUnpublishPost(postToUnpublish.id);
          setPostToUnpublish(null);
        }}
        title='Unpublish from LinkedIn'
        message={
          <div className='space-y-2'>
            <div>This will delete the LinkedIn post and remove it from Kangur Social. Continue?</div>
            {isUnpublishConfirmBlocked ? (
              <div className='rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
                {runtimeConfirmBlockMessage}
              </div>
            ) : null}
          </div>
        }
        confirmText='Unpublish'
        isDangerous={true}
        loading={unpublishMutation.isPending}
        confirmDisabled={isUnpublishConfirmBlocked}
      />
      {isSettingsModalOpen ? (
        <AdminKangurSocialSettingsModal />
      ) : null}
    </KangurAdminContentShell>
  );
}

export function AdminKangurSocialPage(): React.JSX.Element {
  return (
    <SocialPostProvider>
      <AdminKangurSocialPageContent />
    </SocialPostProvider>
  );
}
