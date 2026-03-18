'use client';

import Link from 'next/link';
import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  SelectSimple,
} from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurSocialDocUpdatePlan, KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

import {
  BRAIN_MODEL_DEFAULT_VALUE,
} from './admin-kangur-social/AdminKangurSocialPage.Constants';
import { useAdminKangurSocialPage } from './admin-kangur-social/AdminKangurSocialPage.hooks';
import { SocialPostList } from './admin-kangur-social/SocialPost.List';
import { SocialPostEditor } from './admin-kangur-social/SocialPost.Editor';
import { SocialPostPipeline } from './admin-kangur-social/SocialPost.Pipeline';

export function AdminKangurSocialPage(): React.JSX.Element {
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
    isSettingsDirty,
    isSavingSettings,
    handleSaveSettings,
    docUpdatesResult,
    recentAddons,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl,
    batchCapturePresetIds,
    batchCaptureResult,
    deleteError,
    clearDeleteError,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    addonsQuery,
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
    resolveDocReferences,
    pipelineStep,
    handleRunFullPipeline,
    publishingPostId,
    unpublishingPostId,
    contextSummary,
    contextLoading,
    handleLoadContext,
  } = useAdminKangurSocialPage();

  const [postToDelete, setPostToDelete] = React.useState<KangurSocialPost | null>(null);
  const [postToUnpublish, setPostToUnpublish] = React.useState<KangurSocialPost | null>(null);

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

  return (
    <KangurAdminContentShell
      title='Kangur Social'
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <Breadcrumbs items={breadcrumbs} className='mt-0' />
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            Prepare LinkedIn updates for Kangur and StudiQ improvements.
          </span>
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
            size='sm'
            onClick={() => {
              void handleSaveSettings();
            }}
            disabled={!isSettingsDirty || isSavingSettings}
            variant={isSettingsDirty ? 'success' : 'outline'}
            className={isSettingsDirty ? 'shadow-[0_0_18px_rgba(16,185,129,0.28)]' : undefined}
          >
            {isSavingSettings ? 'Saving settings...' : 'Save Social settings'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleCreateDraft();
            }}
          >
            New draft
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/brain?tab=routing'>AI Brain routing</Link>
          </Button>
        </>
      }
    >
      <div
        className={cn(
          KANGUR_GRID_ROOMY_CLASSNAME,
          'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'
        )}
      >
        <SocialPostList
          posts={posts}
          activePostId={activePostId}
          onSelectPost={setActivePostId}
          onPublishPost={(post, mode): void => {
            void handleQuickPublishPost(post.id, mode);
          }}
          onUnpublishPost={(post): void => {
            setPostToUnpublish(post);
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
            handleRunFullPipeline={handleRunFullPipeline}
          />

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Brain model</div>
                <div className='text-sm text-muted-foreground'>
                  Capability: Kangur Social Post Generation
                </div>
              </div>
              <Badge variant='outline'>{brainModelBadgeLabel}</Badge>
            </div>
            <div className='mt-3 space-y-2'>
              <SelectSimple
                value={brainModelId || BRAIN_MODEL_DEFAULT_VALUE}
                onValueChange={handleBrainModelChange}
                options={brainModelSelectOptions}
                placeholder='Select model override'
                size='sm'
                ariaLabel='Brain model override'
                title='Brain model override'
                disabled={brainModelOptions.isLoading}
              />
            </div>
          </Card>

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Vision model</div>
                <div className='text-sm text-muted-foreground'>
                  Capability: Kangur Social Visual Analysis
                </div>
              </div>
              <Badge variant='outline'>{visionModelBadgeLabel}</Badge>
            </div>
            <div className='mt-3 space-y-2'>
              <SelectSimple
                value={visionModelId || BRAIN_MODEL_DEFAULT_VALUE}
                onValueChange={handleVisionModelChange}
                options={visionModelSelectOptions}
                placeholder='Select model override'
                size='sm'
                ariaLabel='Vision model override'
                title='Vision model override'
                disabled={visionModelOptions.isLoading}
              />
            </div>
          </Card>

          {activePost?.status === 'failed' && activePost.publishError ? (
            <Card
              variant='subtle'
              padding='md'
              className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
            >
              <div className='space-y-2'>
                <div className='text-sm font-semibold text-foreground'>Publish error</div>
                <div className='text-sm text-muted-foreground whitespace-pre-wrap'>
                  {activePost.publishError}
                </div>
              </div>
            </Card>
          ) : null}

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <SocialPostEditor
              activePost={activePost}
              editorState={editorState}
              setEditorState={setEditorState}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              docReferenceInput={docReferenceInput}
              setDocReferenceInput={setDocReferenceInput}
              generationNotes={generationNotes}
              setGenerationNotes={setGenerationNotes}
              handleGenerate={handleGenerate}
              imageAssets={imageAssets}
              handleRemoveImage={handleRemoveImage}
              setShowMediaLibrary={setShowMediaLibrary}
              showMediaLibrary={showMediaLibrary}
              handleAddImages={handleAddImages}
              addonForm={addonForm}
              setAddonForm={setAddonForm}
              handleCreateAddon={handleCreateAddon}
              createAddonPending={createAddonMutation.isPending}
              batchCaptureBaseUrl={batchCaptureBaseUrl}
              setBatchCaptureBaseUrl={setBatchCaptureBaseUrl}
              batchCapturePresetIds={batchCapturePresetIds}
              handleToggleCapturePreset={handleToggleCapturePreset}
              selectAllCapturePresets={selectAllCapturePresets}
              clearCapturePresets={clearCapturePresets}
              handleBatchCapture={handleBatchCapture}
              batchCapturePending={batchCaptureMutation.isPending}
              batchCaptureResult={batchCaptureResult}
              recentAddons={recentAddons}
              recentAddonsLoading={addonsQuery.isLoading}
              selectedAddonSet={selectedAddonSet}
              handleSelectAddon={handleSelectAddon}
              handleRemoveAddon={handleRemoveAddon}
              hasVisualDocUpdates={hasVisualDocUpdates}
              handlePreviewDocUpdates={handlePreviewDocUpdates}
              previewDocUpdatesPending={previewDocUpdatesMutation.isPending}
              handleApplyDocUpdates={handleApplyDocUpdates}
              applyDocUpdatesPending={applyDocUpdatesMutation.isPending}
              docUpdatesResult={docUpdatesResult}
              docUpdatesAppliedAt={docUpdatesAppliedAt}
              docUpdatesAppliedBy={docUpdatesAppliedBy}
              docUpdatesAppliedCount={docUpdatesAppliedCount}
              docUpdatesSkippedCount={docUpdatesSkippedCount}
              docUpdatesPlan={docUpdatesPlan}
              linkedinConnectionId={linkedinConnectionId}
              handleLinkedInConnectionChange={handleLinkedInConnectionChange}
              linkedInOptions={linkedInOptions}
              linkedinIntegration={linkedinIntegration}
              selectedLinkedInConnection={selectedLinkedInConnection}
              linkedInExpiryStatus={linkedInExpiryStatus}
              linkedInExpiryLabel={linkedInExpiryLabel}
              linkedInDaysRemaining={linkedInDaysRemaining}
              handleSave={handleSave}
              handlePublish={handlePublish}
              saveMutationPending={saveMutation.isPending}
              patchMutationPending={patchMutation.isPending}
              publishMutationPending={publishMutation.isPending}
              docsUsed={docsUsed}
              contextSummary={contextSummary}
              contextLoading={contextLoading}
              handleLoadContext={handleLoadContext}
            />
          </Card>

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
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
