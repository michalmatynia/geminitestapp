'use client';

import type React from 'react';
import { CalendarClock } from 'lucide-react';

import { Button, FormSection, Input, TabsContent } from '@/shared/ui';

import { SocialPostEditor } from './SocialPost.Editor';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import {
  resolveEditorModalRuntimeState,
} from './SocialPost.EditorModal.runtime';
import { useSocialPostContext } from './SocialPostContext';

const EmptyEditorTabState = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <div className='rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground'>
    {children}
  </div>
);

export const SocialPostEditorModalEditTab = (): React.ReactElement => {
  const { activePost } = useSocialPostContext();

  return (
    <TabsContent value='edit' className='mt-4 data-[state=inactive]:hidden' forceMount>
      {activePost !== null ? (
        <SocialPostEditor showImagesPanel={false} />
      ) : (
        <EmptyEditorTabState>Select a social post to edit it.</EmptyEditorTabState>
      )}
    </TabsContent>
  );
};

const ScheduleControls = (): React.ReactElement => {
  const context = useSocialPostContext();
  const runtime = resolveEditorModalRuntimeState(context);
  const handleScheduleClick = (): void => {
    void context.handleSave('scheduled');
  };

  return (
    <FormSection title='Scheduling' className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <CalendarClock className='h-4 w-4 text-muted-foreground' />
        <Input
          type='datetime-local'
          aria-label='Scheduled publish date and time'
          value={context.scheduledAt}
          disabled={runtime.hasBlockingRuntimeJob || runtime.hasPublication}
          title={runtime.scheduleActionTitle}
          onChange={(event) => context.setScheduledAt(event.target.value)}
        />
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleScheduleClick}
          disabled={
            context.scheduledAt.length === 0 ||
            context.patchMutation.isPending ||
            runtime.hasBlockingRuntimeJob ||
            runtime.hasPublication
          }
          title={runtime.scheduleActionTitle}
        >
          {context.patchMutation.isPending ? 'Scheduling...' : 'Schedule'}
        </Button>
        <div className='text-xs text-muted-foreground'>
          Pick the publish date and time for this update.
        </div>
      </div>
    </FormSection>
  );
};

export const SocialPostEditorModalScheduleTab = (): React.ReactElement => {
  const { activePost } = useSocialPostContext();

  return (
    <TabsContent value='schedule' className='mt-4 data-[state=inactive]:hidden' forceMount>
      {activePost !== null ? (
        <div className='space-y-4'>
          <ScheduleControls />
        </div>
      ) : (
        <EmptyEditorTabState>Select a social post to schedule it.</EmptyEditorTabState>
      )}
    </TabsContent>
  );
};

export const SocialPostEditorModalImagesTab = (): React.ReactElement => {
  const context = useSocialPostContext();
  const runtime = resolveEditorModalRuntimeState(context);

  return (
    <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden' forceMount>
      {context.activePost !== null ? (
        <SocialPostImagesPanel
          imageAssets={context.imageAssets}
          handleRemoveImage={context.handleRemoveImage}
          setShowMediaLibrary={context.setShowMediaLibrary}
          showMediaLibrary={context.showMediaLibrary}
          handleAddImages={context.handleAddImages}
          isInteractionBlocked={runtime.hasBlockingImageMutationJob}
          interactionTitle={runtime.imageMutationTitle}
        />
      ) : (
        <EmptyEditorTabState>Select a social post to review its images.</EmptyEditorTabState>
      )}
    </TabsContent>
  );
};
