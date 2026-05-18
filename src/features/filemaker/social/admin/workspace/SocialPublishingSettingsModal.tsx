'use client';

import React from 'react';

import {
  FormModal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
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
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

type RuntimeJob = {
  id: string;
  status: string | null | undefined;
  failedReason?: string | null;
  progress?: {
    message?: string | null;
  } | null;
};

type RuntimeJobEntry = {
  job: RuntimeJob;
  label: string;
  title: string | undefined;
};

const toNonEmptyText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toSocialSettingsTab = (value: string): SocialSettingsTab | null => {
  switch (value) {
    case 'models':
    case 'project':
    case 'documentation':
    case 'publishing':
    case 'capture':
    case 'content-browser':
      return value;
    default:
      return null;
  }
};

const getRuntimeJobTitle = (job: RuntimeJob): string | undefined => {
  const parts = [
    toNonEmptyText(job.progress?.message),
    toNonEmptyText(job.failedReason),
    `Queue job: ${job.id}`,
  ];
  const title = parts.filter((value): value is string => value !== null).join(' · ');
  return title.length > 0 ? title : undefined;
};

const appendRuntimeJobEntry = (
  entries: RuntimeJobEntry[],
  job: RuntimeJob | null | undefined,
  label: string
): void => {
  if (job === null || job === undefined || toNonEmptyText(job.status) === null) {
    return;
  }
  entries.push({ job, label, title: getRuntimeJobTitle(job) });
};

const getRuntimeJobEntries = ({
  currentGenerationJob,
  currentPipelineJob,
  currentVisualAnalysisJob,
}: ReturnType<typeof useSocialPostContext>): RuntimeJobEntry[] => {
  const entries: RuntimeJobEntry[] = [];
  appendRuntimeJobEntry(entries, currentVisualAnalysisJob, 'Image analysis');
  appendRuntimeJobEntry(entries, currentGenerationJob, 'Generate post');
  appendRuntimeJobEntry(entries, currentPipelineJob, 'Full pipeline');
  return entries;
};

function SocialSettingsRuntimeJobs(): React.JSX.Element | null {
  const entries = getRuntimeJobEntries(useSocialPostContext());
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className='mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <span className='font-medium text-foreground/80'>Runtime jobs:</span>
      {entries.map((entry) => (
        <SocialJobStatusPill
          key={entry.label}
          status={entry.job.status}
          config={{
            label: entry.label,
            title: entry.title,
            className: 'text-[10px]',
          }}
        />
      ))}
    </div>
  );
}

function SocialSettingsTabs(): React.JSX.Element {
  const { activeTab, setActiveTab } = useSocialSettingsModalContext();
  const handleTabChange = (value: string): void => {
    const nextTab = toSocialSettingsTab(value);
    if (nextTab !== null) {
      setActiveTab(nextTab);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
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
  );
}

function SocialPublishingSettingsModalContent(): React.JSX.Element {
  return (
    <>
      <SocialSettingsRuntimeJobs />
      <SocialSettingsTabs />
    </>
  );
}

type SocialPublishingSettingsModalProps = {
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  onClose?: () => void;
  onSave?: () => void | Promise<void>;
  open?: boolean;
  subtitle?: string;
};

type SettingsModalControls = {
  handleSave: () => void | Promise<void>;
  hasBlockingRuntimeJob: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onClose: () => void;
  open: boolean;
};

type SocialPostContextState = ReturnType<typeof useSocialPostContext>;

const resolveSaveSettingsTitle = ({
  hasBlockingRuntimeJob,
  hasUnsavedChanges,
}: {
  hasBlockingRuntimeJob: boolean;
  hasUnsavedChanges: boolean;
}): string | undefined => {
  if (hasBlockingRuntimeJob) {
    return 'Wait for the current Social runtime job to finish.';
  }
  if (!hasUnsavedChanges) {
    return 'No settings changes to save.';
  }
  return undefined;
};

const hasBlockingRuntimeJob = (context: SocialPostContextState): boolean =>
  isSocialRuntimeJobInFlight(context.currentVisualAnalysisJob?.status) ||
  isSocialRuntimeJobInFlight(context.currentGenerationJob?.status) ||
  isSocialRuntimeJobInFlight(context.currentPipelineJob?.status);

const resolveSettingsModalControls = ({
  context,
  props,
}: {
  context: SocialPostContextState;
  props: Omit<SocialPublishingSettingsModalProps, 'subtitle'>;
}): SettingsModalControls => ({
  open: props.open ?? context.isSettingsModalOpen,
  isSaving: props.isSaving ?? context.isSavingSettings,
  hasUnsavedChanges: props.hasUnsavedChanges ?? context.isSettingsDirty,
  onClose: props.onClose ?? (() => context.setIsSettingsModalOpen(false)),
  handleSave: props.onSave ?? context.handleSaveSettings,
  hasBlockingRuntimeJob: hasBlockingRuntimeJob(context),
});

export function SocialPublishingSettingsModal({
  hasUnsavedChanges: hasUnsavedChangesOverride,
  isSaving: isSavingOverride,
  onClose: onCloseOverride,
  onSave: onSaveOverride,
  open: openOverride,
  subtitle = 'Choose social publishing models from the AI Brain catalog and manage project references.',
}: SocialPublishingSettingsModalProps): React.JSX.Element {
  const context = useSocialPostContext();
  const {
    handleSave,
    hasBlockingRuntimeJob: isSaveBlockedByRuntimeJob,
    hasUnsavedChanges,
    isSaving,
    onClose,
    open,
  } = resolveSettingsModalControls({
    context,
    props: {
      hasUnsavedChanges: hasUnsavedChangesOverride,
      isSaving: isSavingOverride,
      onClose: onCloseOverride,
      onSave: onSaveOverride,
      open: openOverride,
    },
  });
  const saveSettingsTitle = resolveSaveSettingsTitle({
    hasBlockingRuntimeJob: isSaveBlockedByRuntimeJob,
    hasUnsavedChanges,
  });
  const handleSaveClick = (): void => {
    Promise.resolve(handleSave()).catch(() => undefined);
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title='Social Settings'
      subtitle={subtitle}
      onSave={handleSaveClick}
      isSaving={isSaving}
      disableCloseWhileSaving
      isSaveDisabled={!hasUnsavedChanges || isSaving || isSaveBlockedByRuntimeJob}
      hasUnsavedChanges={hasUnsavedChanges}
      saveText='Save Settings'
      saveTitle={saveSettingsTitle}
      cancelText='Close'
      size='xl'
      className='md:min-w-[52rem] max-w-[56rem]'
    >
      <SocialSettingsModalProvider>
        <SocialPublishingSettingsModalContent />
      </SocialSettingsModalProvider>
    </FormModal>
  );
}

export default SocialPublishingSettingsModal;
