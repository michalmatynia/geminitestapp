'use client';

import Link from 'next/link';
import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import {
  Badge,
  Button,
  Card,
  FormSection,
  Input,
  SelectSimple,
  Textarea,
} from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import {
  BRAIN_MODEL_DEFAULT_VALUE,
  PIPELINE_STEP_LABELS,
} from './admin-kangur-social/AdminKangurSocialPage.Constants';
import { useAdminKangurSocialPage } from './admin-kangur-social/AdminKangurSocialPage.hooks';
import { SocialPostList } from './admin-kangur-social/SocialPost.List';
import { SocialPostVisuals } from './admin-kangur-social/SocialPost.Visuals';

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
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl,
    batchCapturePresetIds,
    batchCaptureResult,
    linkedinIntegration,
    linkedinConnections,
    recentAddons,
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

  const docsUsed = React.useMemo(() => {
    const fromPost = activePost?.docReferences ?? [];
    if (fromPost.length > 0) return fromPost;
    return docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }, [activePost?.docReferences, docReferenceInput]);

  const selectedAddonSet = React.useMemo(() => new Set(imageAddonIds), [imageAddonIds]);
  const hasVisualDocUpdates = (activePost?.visualDocUpdates?.length ?? 0) > 0;
  const docUpdatesAppliedAt =
    docUpdatesResult?.post?.docUpdatesAppliedAt ?? activePost?.docUpdatesAppliedAt ?? null;
  const docUpdatesAppliedBy =
    docUpdatesResult?.post?.docUpdatesAppliedBy ?? activePost?.docUpdatesAppliedBy ?? null;
  const docUpdatesPlan = docUpdatesResult?.plan ?? null;
  const docUpdatesAppliedCount = docUpdatesPlan
    ? docUpdatesPlan.items.filter((item) => item.applied).length
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
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void handleRunFullPipeline();
            }}
            disabled={
              !activePost ||
              pipelineStep === 'capturing' ||
              pipelineStep === 'saving' ||
              pipelineStep === 'generating' ||
              pipelineStep === 'previewing'
            }
          >
            {PIPELINE_STEP_LABELS[pipelineStep]}
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
              {!visionModelOptions.effectiveModelId && !visionModelOptions.isLoading ? (
                <div className='text-xs text-muted-foreground'>
                  For local vision analysis, install Gemma 3 via Ollama:{' '}
                  <code className='rounded bg-muted px-1 py-0.5 text-[11px]'>
                    ollama pull gemma3
                  </code>
                  . It will be auto-discovered and available in the dropdown. Or configure a vision
                  model in{' '}
                  <Link href='/admin/brain?tab=routing' className='underline'>
                    AI Brain routing
                  </Link>
                  .
                </div>
              ) : null}
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
            <div className='space-y-4'>
              <div className='text-sm font-semibold text-foreground'>Post editor</div>

              <FormSection title='Polish' className='space-y-3'>
                <Input
                  placeholder='Polish title'
                  value={editorState.titlePl}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, titlePl: event.target.value }))
                  }
                />
                <Textarea
                  placeholder='Polish body'
                  rows={5}
                  value={editorState.bodyPl}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, bodyPl: event.target.value }))
                  }
                />
              </FormSection>

              <FormSection title='English' className='space-y-3'>
                <Input
                  placeholder='English title'
                  value={editorState.titleEn}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, titleEn: event.target.value }))
                  }
                />
                <Textarea
                  placeholder='English body'
                  rows={5}
                  value={editorState.bodyEn}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, bodyEn: event.target.value }))
                  }
                />
              </FormSection>

              <SocialPostVisuals
                activePost={activePost}
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
                imageAssets={imageAssets}
                handleRemoveImage={handleRemoveImage}
                setShowMediaLibrary={setShowMediaLibrary}
                showMediaLibrary={showMediaLibrary}
                handleAddImages={handleAddImages}
                docReferenceInput={docReferenceInput}
                setDocReferenceInput={setDocReferenceInput}
                generationNotes={generationNotes}
                setGenerationNotes={setGenerationNotes}
                handleGenerate={handleGenerate}
                docsUsed={docsUsed}
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
                scheduledAt={scheduledAt}
                setScheduledAt={setScheduledAt}
              />

              <FormSection title='LinkedIn connection' className='space-y-3'>
                <SelectSimple
                  value={linkedinConnectionId ?? undefined}
                  onValueChange={handleLinkedInConnectionChange}
                  options={linkedInOptions}
                  placeholder={
                    linkedinIntegration
                      ? 'Select LinkedIn connection'
                      : 'Create LinkedIn integration first'
                  }
                  disabled={!linkedinIntegration || linkedInOptions.length === 0}
                  size='sm'
                  ariaLabel='LinkedIn connection'
                  title='LinkedIn connection'
                />
                {!linkedinIntegration ? (
                  <div className='text-xs text-muted-foreground'>
                    Create the LinkedIn integration in Admin &gt; Integrations to enable publishing.
                  </div>
                ) : linkedInOptions.length === 0 ? (
                  <div className='text-xs text-muted-foreground'>
                    Add a LinkedIn connection in Admin &gt; Integrations to select it here.
                  </div>
                ) : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken ? (
                  <div className='text-xs text-red-500'>
                    Selected connection is not authorized. Reconnect in Admin &gt; Integrations.
                  </div>
                ) : linkedInExpiryStatus === 'expired' ? (
                  <div className='text-xs text-red-500'>
                    LinkedIn token expired{linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.
                  </div>
                ) : linkedInExpiryStatus === 'warning' ? (
                  <div className='text-xs text-amber-500'>
                    LinkedIn token expires in {linkedInDaysRemaining} day
                    {linkedInDaysRemaining === 1 ? '' : 's'}
                    {linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.
                  </div>
                ) : null}
              </FormSection>

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    void handleSave('draft');
                  }}
                  disabled={!activePost || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save draft'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    void handleSave('scheduled');
                  }}
                  disabled={!activePost || !scheduledAt || patchMutation.isPending}
                >
                  {patchMutation.isPending ? 'Scheduling...' : 'Schedule'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    void handlePublish();
                  }}
                  disabled={!activePost || publishMutation.isPending}
                >
                  {publishMutation.isPending ? 'Publishing...' : 'Publish to LinkedIn'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
