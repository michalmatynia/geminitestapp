'use client';

import type React from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { Button, Input } from '@/shared/ui';

import type { AddonFormState } from '../SocialPublishingPage.Constants';
import { useSocialPostContext } from '../SocialPostContext';
import {
  resolveCaptureActionState,
  type SocialCaptureActionState,
} from './SocialSettingsCaptureTab.runtime';

type AddonFormSetter = ReturnType<typeof useSocialPostContext>['setAddonForm'];

type SingleAddonFieldGridProps = {
  addonForm: AddonFormState;
  setAddonForm: AddonFormSetter;
  actionState: SocialCaptureActionState;
};

const updateAddonField =
  (setAddonForm: AddonFormSetter, field: keyof AddonFormState) =>
  (event: React.ChangeEvent<HTMLInputElement>): void => {
    setAddonForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

const SingleAddonFieldGrid = ({
  addonForm,
  setAddonForm,
  actionState,
}: SingleAddonFieldGridProps): React.ReactElement => (
  <div className='grid gap-3 lg:grid-cols-2'>
    <Input
      placeholder='Add-on title'
      value={addonForm.title}
      onChange={updateAddonField(setAddonForm, 'title')}
      aria-label='Add-on title'
      disabled={actionState.hasCaptureActionLock}
      title={actionState.captureActionTitle}
    />
    <Input
      type='url'
      placeholder='Source URL'
      value={addonForm.sourceUrl}
      onChange={updateAddonField(setAddonForm, 'sourceUrl')}
      aria-label='Source URL'
      disabled={actionState.hasCaptureActionLock}
      title={actionState.captureActionTitle}
    />
    <Input
      placeholder='Optional selector'
      value={addonForm.selector}
      onChange={updateAddonField(setAddonForm, 'selector')}
      aria-label='Optional selector'
      disabled={actionState.hasCaptureActionLock}
      title={actionState.captureActionTitle}
    />
    <Input
      type='number'
      min='0'
      step='100'
      placeholder='Wait before capture (ms)'
      value={addonForm.waitForMs}
      onChange={updateAddonField(setAddonForm, 'waitForMs')}
      aria-label='Wait before capture (ms)'
      disabled={actionState.hasCaptureActionLock}
      title={actionState.captureActionTitle}
    />
    <Input
      placeholder='Optional description'
      value={addonForm.description}
      onChange={updateAddonField(setAddonForm, 'description')}
      aria-label='Optional description'
      disabled={actionState.hasCaptureActionLock}
      title={actionState.captureActionTitle}
    />
  </div>
);

export function SocialSettingsCaptureSingleAddonCard(): React.ReactElement {
  const context = useSocialPostContext();
  const actionState = resolveCaptureActionState({
    batchCapturePending: context.batchCapturePending,
    batchCaptureJob: context.batchCaptureJob,
    runtimeJobs: [
      context.currentVisualAnalysisJob,
      context.currentGenerationJob,
      context.currentPipelineJob,
    ],
  });
  const createAddonMutationPending = context.createAddonMutation.isPending;
  const isCreateDisabled =
    context.addonForm.title.trim().length === 0 ||
    context.addonForm.sourceUrl.trim().length === 0 ||
    createAddonMutationPending ||
    actionState.hasCaptureActionLock;
  const handleCreateClick = (): void => {
    void context.handleCreateAddon();
  };

  return (
    <KangurAdminCard>
      <div className='space-y-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Capture single add-on</div>
          <div className='text-sm text-muted-foreground'>
            Create reusable visuals for any Social Publishing post.
          </div>
        </div>
        <SingleAddonFieldGrid
          addonForm={context.addonForm}
          setAddonForm={context.setAddonForm}
          actionState={actionState}
        />
        <Button
          type='button'
          size='sm'
          onClick={handleCreateClick}
          disabled={isCreateDisabled}
          title={actionState.captureActionTitle}
        >
          {createAddonMutationPending ? 'Creating...' : 'Create single add-on'}
        </Button>
      </div>
    </KangurAdminCard>
  );
}
