'use client';

import React from 'react';

/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import {
  FormModal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/features/kangur/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import {
  type SocialSettingsTab,
  useSocialSettingsModalState,
} from './social-settings-modal/SocialSettingsModal.hooks';
import { SocialSettingsModelsTab } from './social-settings-modal/SocialSettingsModelsTab';
import { SocialSettingsProjectTab } from './social-settings-modal/SocialSettingsProjectTab';
import { SocialSettingsDocumentationTab } from './social-settings-modal/SocialSettingsDocumentationTab';
import { SocialSettingsPublishingTab } from './social-settings-modal/SocialSettingsPublishingTab';
import { SocialSettingsCaptureTab } from './social-settings-modal/SocialSettingsCaptureTab';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function AdminKangurSocialSettingsModal({
  open,
  onClose,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}): React.JSX.Element {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalState(context);

  const {
    activeTab,
    setActiveTab,
    brainModelBadgeLabel,
    brainModelSelectOptions,
    visionModelBadgeLabel,
    visionModelSelectOptions,
    selectedPostTitle,
    linkedInOptions,
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus,
    linkedInExpiryLabel,
    linkedInDaysRemaining,
    docsUsed,
    batchCaptureLimitSummary,
  } = state;

  const {
    activePost,
    addonForm,
    batchCaptureBaseUrl,
    batchCaptureMutation,
    batchCapturePending,
    batchCaptureJob,
    batchCaptureMessage,
    batchCaptureErrorMessage,
    batchCapturePresetIds,
    batchCapturePresetLimit,
    batchCaptureResult,
    brainModelId,
    brainModelOptions,
    canGenerateSocialDraft,
    clearCapturePresets,
    contextLoading,
    createAddonMutation,
    captureAppearanceMode,
    docReferenceInput,
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
    generationNotes,
    handleBatchCapture,
    handleBrainModelChange,
    handleCreateAddon,
    handleGenerate,
    handleLinkedInConnectionChange,
    handleLoadContext,
    handleToggleCapturePreset,
    handleVisionModelChange,
    linkedinConnectionId,
    projectUrl,
    projectUrlError,
    selectAllCapturePresets,
    setAddonForm,
    setBatchCaptureBaseUrl,
    setBatchCapturePresetLimit,
    setDocReferenceInput,
    setGenerationNotes,
    setProjectUrl,
    socialDraftBlockedReason,
    socialVisionWarning,
    handleOpenProgrammablePlaywrightModalFromDefaults,
    handleResetProgrammableCaptureDefaults,
    hasSavedProgrammableCaptureDefaults,
    persistedProgrammableCaptureBaseUrl,
    persistedProgrammableCapturePersonaId,
    persistedProgrammableCaptureScript,
    persistedProgrammableCaptureRoutes,
    visionModelId,
    visionModelOptions,
    contextSummary,
  } = context;
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
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
  const saveSettingsTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : !hasUnsavedChanges
      ? 'No settings changes to save.'
      : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title='Social Settings'
      subtitle='Choose StudiQ Social models from the AI Brain catalog and manage project references.'
      onSave={onSave}
      isSaving={isSaving}
      disableCloseWhileSaving
      isSaveDisabled={!hasUnsavedChanges || isSaving || hasBlockingRuntimeJob}
      hasUnsavedChanges={hasUnsavedChanges}
      saveText='Save Settings'
      saveTitle={saveSettingsTitle}
      cancelText='Close'
      size='xl'
      className='md:min-w-[52rem] max-w-[56rem]'
    >
      {(currentVisualAnalysisJob?.status ||
        currentGenerationJob?.status ||
        currentPipelineJob?.status) ? (
        <div className='mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <span className='font-medium text-foreground/80'>Runtime jobs:</span>
          {currentVisualAnalysisJob?.status ? (
            <SocialJobStatusPill
              status={currentVisualAnalysisJob.status}
              label='Image analysis'
              title={currentVisualAnalysisJobTitle || undefined}
              className='text-[10px]'
            />
          ) : null}
          {currentGenerationJob?.status ? (
            <SocialJobStatusPill
              status={currentGenerationJob.status}
              label='Generate post'
              title={currentGenerationJobTitle || undefined}
              className='text-[10px]'
            />
          ) : null}
          {currentPipelineJob?.status ? (
            <SocialJobStatusPill
              status={currentPipelineJob.status}
              label='Full pipeline'
              title={currentPipelineJobTitle || undefined}
              className='text-[10px]'
            />
          ) : null}
        </div>
      ) : null}
      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as SocialSettingsTab)}
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-2 sm:grid-cols-5' aria-label='Social settings tabs'>
          <TabsTrigger value='models'>Models</TabsTrigger>
          <TabsTrigger value='project'>Project</TabsTrigger>
          <TabsTrigger value='documentation'>Documentation</TabsTrigger>
          <TabsTrigger value='publishing'>Publishing</TabsTrigger>
          <TabsTrigger value='capture'>Capture</TabsTrigger>
        </TabsList>

        <TabsContent value='models' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsModelsTab
            brainModelBadgeLabel={brainModelBadgeLabel}
            brainModelSelectOptions={brainModelSelectOptions}
            brainModelId={brainModelId}
            handleBrainModelChange={handleBrainModelChange}
            brainModelOptionsLoading={brainModelOptions.isLoading}
            visionModelBadgeLabel={visionModelBadgeLabel}
            visionModelSelectOptions={visionModelSelectOptions}
            visionModelId={visionModelId}
            handleVisionModelChange={handleVisionModelChange}
            visionModelOptionsLoading={visionModelOptions.isLoading}
            isRuntimeLocked={hasBlockingRuntimeJob}
          />
        </TabsContent>

        <TabsContent value='project' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsProjectTab
            projectUrl={projectUrl}
            projectUrlError={projectUrlError ?? null}
            setProjectUrl={setProjectUrl}
            isRuntimeLocked={hasBlockingRuntimeJob}
          />
        </TabsContent>

        <TabsContent value='documentation' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsDocumentationTab
            activePost={activePost}
            canGenerateSocialDraft={canGenerateSocialDraft}
            contextLoading={contextLoading}
            currentGenerationJob={currentGenerationJob}
            currentPipelineJob={currentPipelineJob}
            docReferenceInput={docReferenceInput}
            docsUsed={docsUsed}
            generationNotes={generationNotes}
            handleGenerate={handleGenerate}
            handleLoadContext={handleLoadContext}
            contextSummary={contextSummary}
            selectedPostTitle={selectedPostTitle}
            setDocReferenceInput={setDocReferenceInput}
            setGenerationNotes={setGenerationNotes}
            socialDraftBlockedReason={socialDraftBlockedReason}
            socialVisionWarning={socialVisionWarning}
          />
        </TabsContent>

        <TabsContent value='publishing' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsPublishingTab
            linkedinConnectionId={linkedinConnectionId}
            handleLinkedInConnectionChange={(id) => {
              void handleLinkedInConnectionChange(id);
            }}
            linkedInOptions={linkedInOptions}
            linkedinIntegration={linkedinIntegration}
            selectedLinkedInConnection={selectedLinkedInConnection}
            linkedInExpiryStatus={linkedInExpiryStatus}
            linkedInExpiryLabel={linkedInExpiryLabel}
            linkedInDaysRemaining={linkedInDaysRemaining}
            isRuntimeLocked={hasBlockingRuntimeJob}
          />
        </TabsContent>

        <TabsContent value='capture' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsCaptureTab
            addonForm={addonForm}
            setAddonForm={setAddonForm}
            handleCreateAddon={() => { void handleCreateAddon(); }}
            createAddonMutationPending={createAddonMutation.isPending}
            batchCaptureBaseUrl={batchCaptureBaseUrl}
            setBatchCaptureBaseUrl={setBatchCaptureBaseUrl}
            batchCapturePresetLimit={batchCapturePresetLimit}
            setBatchCapturePresetLimit={setBatchCapturePresetLimit}
            batchCapturePresetIds={batchCapturePresetIds}
            handleToggleCapturePreset={handleToggleCapturePreset}
            selectAllCapturePresets={selectAllCapturePresets}
            clearCapturePresets={clearCapturePresets}
            handleBatchCapture={() => {
              void handleBatchCapture();
            }}
            batchCaptureMutationPending={batchCaptureMutation.isPending}
            batchCapturePending={batchCapturePending}
            batchCaptureJob={batchCaptureJob}
            batchCaptureMessage={batchCaptureMessage}
            batchCaptureErrorMessage={batchCaptureErrorMessage}
            batchCaptureResult={batchCaptureResult}
            batchCaptureLimitSummary={batchCaptureLimitSummary}
            currentVisualAnalysisJob={currentVisualAnalysisJob}
            currentGenerationJob={currentGenerationJob}
            currentPipelineJob={currentPipelineJob}
            hasSavedProgrammableCaptureDefaults={hasSavedProgrammableCaptureDefaults}
            programmableCaptureDefaultsBaseUrl={persistedProgrammableCaptureBaseUrl}
            programmableCaptureDefaultsPersonaId={persistedProgrammableCapturePersonaId}
            programmableCaptureDefaultsScript={persistedProgrammableCaptureScript}
            programmableCaptureDefaultsRoutes={persistedProgrammableCaptureRoutes}
            captureAppearanceMode={captureAppearanceMode ?? 'default'}
            handleOpenProgrammableCaptureModal={
              handleOpenProgrammablePlaywrightModalFromDefaults
            }
            handleResetProgrammableCaptureDefaults={() => {
              void handleResetProgrammableCaptureDefaults();
            }}
          />
        </TabsContent>
      </Tabs>
    </FormModal>
  );
}

export default AdminKangurSocialSettingsModal;
