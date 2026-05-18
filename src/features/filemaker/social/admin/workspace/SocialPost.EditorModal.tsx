'use client';

import React from 'react';

import {
  FormModal,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { SocialPostEditorModalActions } from './SocialPost.EditorModalActions';
import {
  resolveEditorModalRuntimeState,
  resolvePostSubtitle,
  resolvePostTitle,
  type SocialPostEditorTab,
} from './SocialPost.EditorModal.runtime';
import {
  SocialPostEditorModalEditTab,
  SocialPostEditorModalImagesTab,
  SocialPostEditorModalScheduleTab,
} from './SocialPost.EditorModalTabs';
import { useSocialPostContext } from './SocialPostContext';

const isSocialPostEditorTab = (value: string): value is SocialPostEditorTab =>
  value === 'edit' || value === 'schedule' || value === 'images';

export function SocialPostEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const context = useSocialPostContext();
  const runtime = resolveEditorModalRuntimeState(context);
  const [activeTab, setActiveTab] = React.useState<SocialPostEditorTab>('edit');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('edit');
    }
  }, [isOpen, context.activePost?.id]);

  const handleSaveDraft = (): void => {
    void context.handleSave('draft');
  };
  const handleTabChange = (value: string): void => {
    if (isSocialPostEditorTab(value)) {
      setActiveTab(value);
    }
  };

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={resolvePostTitle(context.activePost)}
      subtitle={resolvePostSubtitle(context.activePost)}
      onSave={handleSaveDraft}
      isSaving={runtime.isSubmitting}
      disableCloseWhileSaving
      isSaveDisabled={
        context.activePost === null ||
        runtime.isSubmitting ||
        !context.hasUnsavedChanges ||
        runtime.hasBlockingRuntimeJob
      }
      hasUnsavedChanges={context.hasUnsavedChanges}
      saveText={runtime.isSavingDraft ? 'Saving...' : 'Save draft'}
      saveTitle={runtime.saveDraftTitle}
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
      actions={<SocialPostEditorModalActions />}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <TabsList className='grid w-full grid-cols-3' aria-label='Social post editor tabs'>
          <TabsTrigger value='edit'>Edit Post</TabsTrigger>
          <TabsTrigger value='schedule'>Schedule</TabsTrigger>
          <TabsTrigger value='images'>Images</TabsTrigger>
        </TabsList>
        <SocialPostEditorModalEditTab />
        <SocialPostEditorModalScheduleTab />
        <SocialPostEditorModalImagesTab />
      </Tabs>
    </FormModal>
  );
}
