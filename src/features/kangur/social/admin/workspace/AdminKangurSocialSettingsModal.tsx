'use client';

import React from 'react';

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
} from './social-settings-modal/SocialSettingsModal.hooks';
import { SocialSettingsModalProvider, useSocialSettingsModalContext } from './social-settings-modal/SocialSettingsModalContext';
import { SocialSettingsModelsTab } from './social-settings-modal/SocialSettingsModelsTab';
import { SocialSettingsProjectTab } from './social-settings-modal/SocialSettingsProjectTab';
import { SocialSettingsDocumentationTab } from './social-settings-modal/SocialSettingsDocumentationTab';
import { SocialSettingsPublishingTab } from './social-settings-modal/SocialSettingsPublishingTab';
import { SocialSettingsCaptureTab } from './social-settings-modal/SocialSettingsCaptureTab';
import { SocialSettingsContentBrowserTab } from './social-settings-modal/SocialSettingsContentBrowserTab';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

function AdminKangurSocialSettingsModalContent(): React.JSX.Element {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalContext();

  const {
    activeTab,
    setActiveTab,
  } = state;

  const {
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
  } = context;
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

  return (
    <>
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
        <TabsList className='grid w-full grid-cols-3 sm:grid-cols-6' aria-label='Social settings tabs'>
          <TabsTrigger value='models'>Models</TabsTrigger>
          <TabsTrigger value='project'>Project</TabsTrigger>
          <TabsTrigger value='documentation'>Documentation</TabsTrigger>
          <TabsTrigger value='publishing'>Publishing</TabsTrigger>
          <TabsTrigger value='capture'>Capture</TabsTrigger>
          <TabsTrigger value='content-browser'>Content</TabsTrigger>
        </TabsList>

        <TabsContent value='models' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsModelsTab />
        </TabsContent>

        <TabsContent value='project' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsProjectTab />
        </TabsContent>

        <TabsContent value='documentation' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsDocumentationTab />
        </TabsContent>

        <TabsContent value='publishing' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsPublishingTab />
        </TabsContent>

        <TabsContent value='capture' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsCaptureTab />
        </TabsContent>

        <TabsContent value='content-browser' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <SocialSettingsContentBrowserTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

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
  const {
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
  } = context;
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);

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
      <SocialSettingsModalProvider>
        <AdminKangurSocialSettingsModalContent />
      </SocialSettingsModalProvider>
    </FormModal>
  );
}

export default AdminKangurSocialSettingsModal;
