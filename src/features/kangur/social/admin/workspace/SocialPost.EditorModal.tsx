'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';

import {
  Badge,
  Button,
  FormModal,
  FormSection,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/features/kangur/shared/ui';
import {
  hasKangurSocialLinkedInPublication,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';

import {
  formatDatetimeDisplay,
} from './AdminKangurSocialPage.Constants';
import { SocialPostEditor } from './SocialPost.Editor';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import { useSocialPostContext } from './SocialPostContext';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const resolvePostTitle = (
  post: Pick<KangurSocialPost, 'titlePl' | 'titleEn'> | null
): string =>
  post?.titlePl.trim() || post?.titleEn.trim() || 'Untitled update';

const resolvePostSubtitle = (
  post: Pick<
    KangurSocialPost,
    'status' | 'publishedAt' | 'scheduledAt' | 'linkedinPostId' | 'linkedinUrl'
  > | null
): string => {
  if (!post) return 'Edit copy and review attached images.';
  if (hasKangurSocialLinkedInPublication(post)) {
    return post.publishedAt
      ? `Published on LinkedIn ${formatDatetimeDisplay(post.publishedAt)}`
      : 'Published on LinkedIn';
  }
  if (post.status === 'scheduled' && post.scheduledAt) {
    return `Scheduled ${formatDatetimeDisplay(post.scheduledAt)}`;
  }
  return 'Edit copy and review attached images.';
};

export function SocialPostEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const {
    activePost,
    scheduledAt,
    setScheduledAt,
    hasUnsavedChanges,
    handleSave,
    handlePublish,
    patchMutation,
    publishMutation,
    currentPipelineJob,
    currentGenerationJob,
    currentVisualAnalysisJob,
    imageAssets,
    handleRemoveImage,
    setShowMediaLibrary,
    showMediaLibrary,
    handleAddImages,
  } = useSocialPostContext();

  const [activeTab, setActiveTab] = React.useState<'edit' | 'schedule' | 'images'>('edit');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('edit');
    }
  }, [isOpen, activePost?.id]);

  const isSavingDraft = patchMutation.isPending && !publishMutation.isPending;
  const isSubmitting = patchMutation.isPending || publishMutation.isPending;
  const hasLinkedInPublication = hasKangurSocialLinkedInPublication(activePost);
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const hasBlockingImageMutationJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) || hasBlockingRuntimeJob;
  const editorActionTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : hasLinkedInPublication
      ? 'This post is already published on LinkedIn. Unpublish it from the posts list before publishing again.'
      : undefined;
  const publishActionLabel = publishMutation.isPending
    ? 'Publishing...'
    : hasLinkedInPublication
      ? 'Published on LinkedIn'
    : undefined;
  const imageMutationTitle = hasBlockingImageMutationJob
    ? 'Wait for the current Social runtime job to finish.'
    : undefined;
  const scheduleActionTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : hasLinkedInPublication
      ? 'This post is already published on LinkedIn. Unpublish it from the posts list before scheduling again.'
      : undefined;
  const saveDraftTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : !activePost
      ? 'Select a social post to save it.'
      : !hasUnsavedChanges
        ? 'No draft changes to save.'
        : undefined;
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
  const modalActions = activePost ? (
    <>
      {imageAssets.length > 0 ? (
        <Badge variant='outline'>
          {imageAssets.length} image
          {imageAssets.length === 1 ? '' : 's'}
        </Badge>
      ) : null}
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
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          void handlePublish();
        }}
        disabled={!activePost || isSubmitting || hasBlockingRuntimeJob || hasLinkedInPublication}
        title={editorActionTitle}
      >
        {publishActionLabel || 'Publish to LinkedIn'}
      </Button>
    </>
  ) : null;
  const imagePanelProps = {
    imageAssets,
    handleRemoveImage,
    setShowMediaLibrary,
    showMediaLibrary,
    handleAddImages,
    isInteractionBlocked: hasBlockingImageMutationJob,
    interactionTitle: imageMutationTitle,
  };

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={resolvePostTitle(activePost)}
      subtitle={resolvePostSubtitle(activePost)}
      onSave={() => {
        void handleSave('draft');
      }}
      isSaving={isSubmitting}
      disableCloseWhileSaving
      isSaveDisabled={!activePost || isSubmitting || !hasUnsavedChanges || hasBlockingRuntimeJob}
      hasUnsavedChanges={hasUnsavedChanges}
      saveText={isSavingDraft ? 'Saving...' : 'Save draft'}
      saveTitle={saveDraftTitle}
      cancelText='Close'
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
      actions={modalActions}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'edit' | 'schedule' | 'images')}
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-3' aria-label='Social post editor tabs'>
          <TabsTrigger value='edit'>Edit Post</TabsTrigger>
          <TabsTrigger value='schedule'>Schedule</TabsTrigger>
          <TabsTrigger value='images'>Images</TabsTrigger>
        </TabsList>

        <TabsContent value='edit' className='mt-4 data-[state=inactive]:hidden' forceMount>
          {activePost ? (
            <SocialPostEditor showImagesPanel={false} />
          ) : (
            <div className='rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground'>
              Select a social post to edit it.
            </div>
          )}
        </TabsContent>

        <TabsContent value='schedule' className='mt-4 data-[state=inactive]:hidden' forceMount>
          {activePost ? (
            <div className='space-y-4'>
              <FormSection title='Scheduling' className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <CalendarClock className='h-4 w-4 text-muted-foreground' />
                  <Input
                    type='datetime-local'
                    aria-label='Scheduled publish date and time'
                    value={scheduledAt}
                    disabled={hasBlockingRuntimeJob || hasLinkedInPublication}
                    title={scheduleActionTitle}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      void handleSave('scheduled');
                    }}
                    disabled={
                      !activePost ||
                      !scheduledAt ||
                      patchMutation.isPending ||
                      hasBlockingRuntimeJob ||
                      hasLinkedInPublication
                    }
                    title={scheduleActionTitle}
                  >
                    {patchMutation.isPending ? 'Scheduling...' : 'Schedule'}
                  </Button>
                  <div className='text-xs text-muted-foreground'>
                    Pick the LinkedIn publish date and time for this update.
                  </div>
                </div>
              </FormSection>
            </div>
          ) : (
            <div className='rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground'>
              Select a social post to schedule it.
            </div>
          )}
        </TabsContent>

        <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden' forceMount>
          {activePost ? (
            <SocialPostImagesPanel {...imagePanelProps} />
          ) : (
            <div className='rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground'>
              Select a social post to review its images.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </FormModal>
  );
}
