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
import type { KangurSocialDocUpdatePlan, KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';

import { BRAIN_MODEL_DEFAULT_VALUE } from './admin-kangur-social/AdminKangurSocialPage.Constants';
import { useAdminKangurSocialPage } from './admin-kangur-social/AdminKangurSocialPage.hooks';
import { AdminKangurSocialSettingsModal } from './admin-kangur-social/AdminKangurSocialSettingsModal';
import { SocialPostList } from './admin-kangur-social/SocialPost.List';
import { SocialPostEditorModal } from './admin-kangur-social/SocialPost.EditorModal';
import { SocialPostPipeline } from './admin-kangur-social/SocialPost.Pipeline';
import { KangurSocialPipelineQueuePanel } from './admin-kangur-social/KangurSocialPipelineQueuePanel';
import { KangurAdminCard } from './components/KangurAdminCard';

export function AdminKangurSocialPage(): React.JSX.Element {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isPostEditorModalOpen, setIsPostEditorModalOpen] = React.useState(false);
  const {
    posts,
    activePostId,
    setActivePostId,
    activePost,
    editorState,
    setEditorState,
    scheduledAt,
    setScheduledAt,
    docReferenceInput,
    setDocReferenceInput,
    generationNotes,
    setGenerationNotes,
    imageAssets,
    imageAddonIds,
    addonForm,
    setAddonForm,
    showMediaLibrary,
    setShowMediaLibrary,
    linkedinConnectionId,
    brainModelId,
    visionModelId,
    projectUrl,
    setProjectUrl,
    isSettingsDirty,
    isSavingSettings,
    handleSaveSettings,
    docUpdatesResult,
    recentAddons,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl,
    batchCapturePresetIds,
    batchCapturePresetLimit,
    setBatchCapturePresetLimit,
    effectiveBatchCapturePresetCount,
    batchCaptureResult,
    deleteError,
    clearDeleteError,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    addonsQuery,
    postsQuery,
    saveMutation,
    patchMutation,
    deleteMutation,
    publishMutation,
    unpublishMutation,
    previewDocUpdatesMutation,
    applyDocUpdatesMutation,
    createAddonMutation,
    batchCaptureMutation,
    handleCreateDraft,
    handleDeletePost,
    handleQuickPublishPost,
    handleUnpublishPost,
    handleSave,
    handleGenerate,
    handlePreviewDocUpdates,
    handleApplyDocUpdates,
    handleSelectAddon,
    handleRemoveAddon,
    handleCreateAddon,
    handleBatchCapture,
    handlePublish,
    handleRemoveImage,
    handleAddImages,
    handleToggleCapturePreset,
    selectAllCapturePresets,
    clearCapturePresets,
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
    canGenerateSocialDraft,
    socialDraftBlockedReason,
    canRunFreshCapturePipeline,
    socialBatchCaptureBlockedReason,
    socialVisionWarning,
    resolveDocReferences,
    pipelineStep,
    pipelineProgress,
    pipelineErrorMessage,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    captureOnlyPending,
    captureOnlyMessage,
    captureOnlyErrorMessage,
    handleCaptureImagesOnly,
    publishingPostId,
    unpublishingPostId,
    contextSummary,
    contextLoading,
    handleLoadContext,
  } = useAdminKangurSocialPage();

  const [postToDelete, setPostToDelete] = React.useState<KangurSocialPost | null>(null);
  const [postToUnpublish, setPostToUnpublish] = React.useState<KangurSocialPost | null>(null);
  const isInitialPageLoading = postsQuery.isLoading && posts.length === 0;

  const brainModelSelectOptions = React.useMemo(() => {
    const defaultDescription = brainModelOptions.effectiveModelId
      ? `Default: ${brainModelOptions.effectiveModelId}`
      : 'Default model not configured';
    return [
      {
        value: BRAIN_MODEL_DEFAULT_VALUE,
        label: 'Use Brain routing',
        description: defaultDescription,
      },
      ...brainModelOptions.models.map((modelId) => ({
        value: modelId,
        label: modelId,
        description: modelId === brainModelOptions.effectiveModelId ? 'Routing default' : undefined,
      })),
    ];
  }, [brainModelOptions.effectiveModelId, brainModelOptions.models]);

  const visionModelSelectOptions = React.useMemo(() => {
    const defaultDescription = visionModelOptions.effectiveModelId
      ? `Default: ${visionModelOptions.effectiveModelId}`
      : 'Default model not configured';
    return [
      {
        value: BRAIN_MODEL_DEFAULT_VALUE,
        label: 'Use Brain routing',
        description: defaultDescription,
      },
      ...visionModelOptions.models.map((modelId) => ({
        value: modelId,
        label: modelId,
        description: modelId === visionModelOptions.effectiveModelId ? 'Routing default' : undefined,
      })),
    ];
  }, [visionModelOptions.effectiveModelId, visionModelOptions.models]);

  const linkedInOptions = React.useMemo(
    () =>
      linkedinConnections.map((connection) => ({
        value: connection.id,
        label: connection.name || connection.username || 'LinkedIn connection',
        description: connection.hasLinkedInAccessToken ? 'Connected' : 'Not connected',
        disabled: connection.hasLinkedInAccessToken === false,
      })),
    [linkedinConnections]
  );

  const selectedLinkedInConnection = React.useMemo(
    () =>
      linkedinConnections.find((connection) => connection.id === linkedinConnectionId) ?? null,
    [linkedinConnections, linkedinConnectionId]
  );

  const brainModelBadgeLabel =
    brainModelId ?? brainModelOptions.effectiveModelId ?? 'Not configured';
  const visionModelBadgeLabel =
    visionModelId ?? visionModelOptions.effectiveModelId ?? 'Not configured';

  const linkedInExpiry = selectedLinkedInConnection?.linkedinExpiresAt
    ? new Date(selectedLinkedInConnection.linkedinExpiresAt)
    : null;
  const linkedInExpiryTime = linkedInExpiry ? linkedInExpiry.getTime() : null;
  const linkedInDaysRemaining =
    linkedInExpiryTime !== null
      ? Math.ceil((linkedInExpiryTime - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const linkedInExpiryLabel = linkedInExpiry ? linkedInExpiry.toLocaleString() : null;
  const linkedInExpiryStatus =
    linkedInDaysRemaining !== null && linkedInExpiryTime !== null
      ? linkedInExpiryTime <= Date.now()
        ? 'expired'
        : linkedInDaysRemaining <= 7
          ? 'warning'
          : 'ok'
      : null;

  const docsUsed = React.useMemo(() => resolveDocReferences(), [resolveDocReferences]);

  const selectedAddonSet = React.useMemo(() => new Set(imageAddonIds), [imageAddonIds]);
  const hasVisualDocUpdates = (activePost?.visualDocUpdates?.length ?? 0) > 0;
  const docUpdatesAppliedAt =
    docUpdatesResult?.post?.docUpdatesAppliedAt ?? activePost?.docUpdatesAppliedAt ?? null;
  const docUpdatesAppliedBy =
    docUpdatesResult?.post?.docUpdatesAppliedBy ?? activePost?.docUpdatesAppliedBy ?? null;
  const docUpdatesPlan: KangurSocialDocUpdatePlan | null = docUpdatesResult?.plan ?? null;
  const docUpdatesAppliedCount = docUpdatesPlan
    ? docUpdatesPlan.items.filter((item) => item.applied).length
    : 0;
  const docUpdatesSkippedCount = docUpdatesPlan
    ? docUpdatesPlan.items.length - docUpdatesAppliedCount
    : 0;
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

  const handleOpenPostEditor = React.useCallback(
    (postId: string): void => {
      setActivePostId(postId);
      setIsPostEditorModalOpen(true);
    },
    [setActivePostId]
  );

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
          <SocialPostList
            posts={posts}
            activePostId={activePostId}
            isLoading={postsQuery.isLoading}
            onSelectPost={setActivePostId}
            onOpenPost={handleOpenPostEditor}
            onPublishPost={(post, options): void => {
              void handleQuickPublishPost(post.id, 'published', options);
            }}
            onUnpublishPost={(post, options): void => {
              if (options?.keepLocal) {
                void handleUnpublishPost(post.id, { keepLocal: true });
              } else {
                setPostToUnpublish(post);
              }
            }}
            publishPendingId={publishingPostId}
            unpublishPendingId={unpublishingPostId}
            onDeletePost={(post): void => {
              clearDeleteError();
              setPostToDelete(post);
            }}
          />

          <div className='space-y-6'>
            <SocialPostPipeline
              activePostId={activePostId}
              pipelineStep={pipelineStep}
              pipelineProgress={pipelineProgress}
              pipelineErrorMessage={pipelineErrorMessage}
              handleRunFullPipeline={handleRunFullPipeline}
              handleRunFullPipelineWithFreshCapture={handleRunFullPipelineWithFreshCapture}
              handleCaptureImagesOnly={handleCaptureImagesOnly}
              canRunPipeline={canGenerateSocialDraft}
              canRunFreshCapturePipeline={canRunFreshCapturePipeline}
              canCaptureImagesOnly={Boolean(activePostId) && Boolean(batchCaptureBaseUrl.trim()) && batchCapturePresetIds.length > 0}
              pipelineBlockedReason={socialDraftBlockedReason}
              captureBlockedReason={socialBatchCaptureBlockedReason}
              captureOnlyPending={captureOnlyPending}
              captureOnlyMessage={captureOnlyMessage}
              captureOnlyErrorMessage={captureOnlyErrorMessage}
              batchCapturePresetCount={batchCapturePresetIds.length}
              effectiveBatchCapturePresetCount={effectiveBatchCapturePresetCount}
              batchCapturePresetLimit={batchCapturePresetLimit}
            />

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
        activePost={activePost}
        editorProps={{
          activePost,
          editorState,
          setEditorState,
          scheduledAt,
          setScheduledAt,
          imageAssets,
          handleRemoveImage,
          setShowMediaLibrary,
          showMediaLibrary,
          handleAddImages,
          recentAddons,
          recentAddonsLoading: addonsQuery.isLoading,
          selectedAddonSet,
          handleSelectAddon,
          handleRemoveAddon,
          handleSave,
          handlePublish,
          saveMutationPending: saveMutation.isPending,
          patchMutationPending: patchMutation.isPending,
          publishMutationPending: publishMutation.isPending,
        }}
        imagesProps={{
          imageAssets,
          handleRemoveImage,
          setShowMediaLibrary,
          showMediaLibrary,
          handleAddImages,
        }}
      />

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
        brainModelId={brainModelId}
        visionModelId={visionModelId}
        projectUrl={projectUrl}
        brainModelBadgeLabel={brainModelBadgeLabel}
        visionModelBadgeLabel={visionModelBadgeLabel}
        brainModelSelectOptions={brainModelSelectOptions}
        visionModelSelectOptions={visionModelSelectOptions}
        brainModelLoading={brainModelOptions.isLoading}
        visionModelLoading={visionModelOptions.isLoading}
        linkedinConnectionId={linkedinConnectionId}
        linkedInOptions={linkedInOptions}
        linkedinIntegration={linkedinIntegration}
        selectedLinkedInConnection={selectedLinkedInConnection}
        linkedInExpiryStatus={linkedInExpiryStatus}
        linkedInExpiryLabel={linkedInExpiryLabel}
        linkedInDaysRemaining={linkedInDaysRemaining}
        addonForm={addonForm}
        setAddonForm={setAddonForm}
        createAddonPending={createAddonMutation.isPending}
        batchCaptureBaseUrl={batchCaptureBaseUrl}
        batchCapturePresetIds={batchCapturePresetIds}
        batchCapturePresetLimit={batchCapturePresetLimit}
        effectiveBatchCapturePresetCount={effectiveBatchCapturePresetCount}
        batchCapturePending={batchCaptureMutation.isPending}
        batchCaptureResult={batchCaptureResult}
        activePost={activePost}
        contextSummary={contextSummary}
        contextLoading={contextLoading}
        docReferenceInput={docReferenceInput}
        generationNotes={generationNotes}
        docsUsed={docsUsed}
        hasVisualDocUpdates={hasVisualDocUpdates}
        previewDocUpdatesPending={previewDocUpdatesMutation.isPending}
        applyDocUpdatesPending={applyDocUpdatesMutation.isPending}
        docUpdatesResult={docUpdatesResult}
        docUpdatesAppliedAt={docUpdatesAppliedAt}
        docUpdatesAppliedBy={docUpdatesAppliedBy}
        docUpdatesAppliedCount={docUpdatesAppliedCount}
        docUpdatesSkippedCount={docUpdatesSkippedCount}
        docUpdatesPlan={docUpdatesPlan}
        canGenerateDraft={canGenerateSocialDraft}
        generateDraftBlockedReason={socialDraftBlockedReason}
        socialVisionWarning={socialVisionWarning}
        onBrainModelChange={handleBrainModelChange}
        onVisionModelChange={handleVisionModelChange}
        onLinkedInConnectionChange={handleLinkedInConnectionChange}
        onProjectUrlChange={setProjectUrl}
        onDocReferenceInputChange={setDocReferenceInput}
        onGenerationNotesChange={setGenerationNotes}
        onLoadContext={async () => {
          await handleLoadContext();
        }}
        onGenerate={handleGenerate}
        onPreviewDocUpdates={handlePreviewDocUpdates}
        onApplyDocUpdates={handleApplyDocUpdates}
        onHandleCreateAddon={handleCreateAddon}
        onBatchCaptureBaseUrlChange={setBatchCaptureBaseUrl}
        onBatchCapturePresetLimitChange={setBatchCapturePresetLimit}
        onToggleCapturePreset={handleToggleCapturePreset}
        onSelectAllCapturePresets={selectAllCapturePresets}
        onClearCapturePresets={clearCapturePresets}
        onHandleBatchCapture={handleBatchCapture}
      />
    </KangurAdminContentShell>
  );
}
