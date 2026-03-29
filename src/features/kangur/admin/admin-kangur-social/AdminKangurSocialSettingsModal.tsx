'use client';

import React from 'react';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import {
  type SocialSettingsTab,
  useSocialSettingsModalState,
} from './social-settings-modal/SocialSettingsModal.hooks';
import { SocialSettingsModelsTab } from './social-settings-modal/SocialSettingsModelsTab';
import { SocialSettingsProjectTab } from './social-settings-modal/SocialSettingsProjectTab';
import { SocialSettingsDocumentationTab } from './social-settings-modal/SocialSettingsDocumentationTab';
import { SocialSettingsPublishingTab } from './social-settings-modal/SocialSettingsPublishingTab';
import { SocialSettingsCaptureTab } from './social-settings-modal/SocialSettingsCaptureTab';

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
    selectAllCapturePresets,
    setAddonForm,
    setBatchCaptureBaseUrl,
    setBatchCapturePresetLimit,
    setDocReferenceInput,
    setGenerationNotes,
    setProjectUrl,
    socialDraftBlockedReason,
    socialVisionWarning,
    handleOpenProgrammablePlaywrightModal,
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

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title='Social Settings'
      subtitle='Choose StudiQ Social models from the AI Brain catalog and manage project references.'
      onSave={onSave}
      isSaving={isSaving}
      disableCloseWhileSaving
      isSaveDisabled={!hasUnsavedChanges || isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      saveText='Save Settings'
      cancelText='Close'
      size='xl'
      className='md:min-w-[52rem] max-w-[56rem]'
    >
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
          />
        </TabsContent>

        <TabsContent value='project' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsProjectTab
            projectUrl={projectUrl}
            setProjectUrl={setProjectUrl}
          />
        </TabsContent>

        <TabsContent value='documentation' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsDocumentationTab
            activePost={activePost}
            canGenerateSocialDraft={canGenerateSocialDraft}
            contextLoading={contextLoading}
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
            batchCaptureResult={batchCaptureResult}
            batchCaptureLimitSummary={batchCaptureLimitSummary}
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
