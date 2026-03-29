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

import { AdminKangurSocialSettingsModal } from './admin-kangur-social/AdminKangurSocialSettingsModal';
import { SocialPostList } from './admin-kangur-social/SocialPost.List';
import { SocialPostEditorModal } from './admin-kangur-social/SocialPost.EditorModal';
import { SocialPostPipeline } from './admin-kangur-social/SocialPost.Pipeline';
import { SocialPostVisualAnalysisModal } from './admin-kangur-social/SocialPost.VisualAnalysisModal';
import { KangurSocialPipelineQueuePanel } from './admin-kangur-social/KangurSocialPipelineQueuePanel';
import { KangurAdminCard } from './components/KangurAdminCard';
import { SocialPostProvider, useSocialPostContext } from './admin-kangur-social/SocialPostContext';

function AdminKangurSocialPageContent(): React.JSX.Element {
  const {
    posts,
    activePost,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPostEditorModalOpen,
    setIsPostEditorModalOpen,
    postToDelete,
    setPostToDelete,
    postToUnpublish,
    setPostToUnpublish,
    deleteError,
    clearDeleteError,
    postsQuery,
    deleteMutation,
    unpublishMutation,
    handleCreateDraft,
    handleDeletePost,
    handleUnpublishPost,
    handleSaveSettings,
    isSettingsDirty,
    isSavingSettings,
  } = useSocialPostContext();
  const isInitialPageLoading = postsQuery.isLoading && posts.length === 0;

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
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleCreateDraftAndOpen();
            }}
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
      {isInitialPageLoading ? (
        <LoadingState
          message='Loading StudiQ Social...'
          size='lg'
          className='min-h-[360px] rounded-2xl border border-border/60 bg-card/40 shadow-sm'
        />
      ) : (
        <div
          className={cn(
            KANGUR_GRID_ROOMY_CLASSNAME,
            'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'
          )}
        >
          <SocialPostList />

          <div className='space-y-6'>
            <SocialPostPipeline />

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
      )}

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
          </div>
        }
        confirmText='Delete'
        isDangerous={true}
        loading={deleteMutation.isPending}
      />

      <SocialPostEditorModal
        isOpen={isPostEditorModalOpen}
        onClose={() => setIsPostEditorModalOpen(false)}
      />
      <SocialPostVisualAnalysisModal />

      <ConfirmModal
        isOpen={Boolean(postToUnpublish)}
        onClose={(): void => setPostToUnpublish(null)}
        onConfirm={async (): Promise<void> => {
          if (!postToUnpublish) return;
          await handleUnpublishPost(postToUnpublish.id);
          setPostToUnpublish(null);
        }}
        title='Unpublish from LinkedIn'
        message='This will delete the LinkedIn post and remove it from Kangur Social. Continue?'
        confirmText='Unpublish'
        isDangerous={true}
        loading={unpublishMutation.isPending}
      />
      <AdminKangurSocialSettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={() => {
          void handleSaveSettings();
        }}
        isSaving={isSavingSettings}
        hasUnsavedChanges={isSettingsDirty}
      />
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
