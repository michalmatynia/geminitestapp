'use client';

import Link from 'next/link';
import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import {
  Badge,
  Button,
  Card,
  SelectSimple,
} from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';

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
    docUpdatesResult,
    recentAddons,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl,
    batchCapturePresetIds,
    batchCaptureResult,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    addonsQuery,
    saveMutation,
    patchMutation,
    publishMutation,
    previewDocUpdatesMutation,
    applyDocUpdatesMutation,
    createAddonMutation,
    batchCaptureMutation,
    handleCreateDraft,
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
  } = useAdminKangurSocialPage();

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
  const docUpdatesPlan = docUpdatesResult?.plan ?? null;
  const docUpdatesAppliedCount = docUpdatesPlan
    ? docUpdatesPlan.items.filter((item: any) => item.applied).length
    : 0;
  const docUpdatesSkippedCount = docUpdatesPlan
    ? docUpdatesPlan.items.length - docUpdatesAppliedCount
    : 0;

  return (
    <KangurAdminContentShell
      title='Kangur Social'
      description='Prepare LinkedIn updates for Kangur and StudiQ improvements.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Social' },
      ]}
      headerActions={
        <div className='flex flex-wrap items-center gap-2'>
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
        </div>
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
              <Badge variant='outline'>{brainModelOptions.effectiveModelId || 'Not configured'}</Badge>
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
              <Badge variant='outline'>{visionModelOptions.effectiveModelId || 'Not configured'}</Badge>
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
            />
          </Card>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
