'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';

import {
  AppModal,
  Badge,
  Button,
  FormSection,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/features/kangur/shared/ui';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

import {
  formatDatetimeDisplay,
  statusLabel,
} from './AdminKangurSocialPage.Constants';
import { SocialPostEditor } from './SocialPost.Editor';
import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import { useSocialPostContext } from './SocialPostContext';

const resolvePostTitle = (
  post: Pick<KangurSocialPost, 'titlePl' | 'titleEn'> | null
): string =>
  post?.titlePl.trim() || post?.titleEn.trim() || 'Untitled update';

const resolvePostSubtitle = (
  post: Pick<KangurSocialPost, 'status' | 'publishedAt' | 'scheduledAt'> | null
): string => {
  if (!post) return 'Edit copy and review attached images.';
  if (post.status === 'published' && post.publishedAt) {
    return `Published ${formatDatetimeDisplay(post.publishedAt)}`;
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
    handleSave,
    patchMutation,
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

  return (
    <AppModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onClose={onClose}
      title={resolvePostTitle(activePost)}
      subtitle={resolvePostSubtitle(activePost)}
      size='xl'
      className='md:min-w-[63rem] max-w-[66rem]'
      bodyClassName='h-[80vh] overflow-y-auto'
      headerActions={
        activePost ? (
          <>
            <Badge variant={activePost.status === 'published' ? 'secondary' : 'outline'}>
              {statusLabel[activePost.status]}
            </Badge>
            {activePost.imageAssets.length > 0 ? (
              <Badge variant='outline'>
                {activePost.imageAssets.length} image
                {activePost.imageAssets.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </>
        ) : null
      }
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
                      !activePost || !scheduledAt || patchMutation.isPending
                    }
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
            <SocialPostImagesPanel
              imageAssets={imageAssets}
              handleRemoveImage={handleRemoveImage}
              setShowMediaLibrary={setShowMediaLibrary}
              showMediaLibrary={showMediaLibrary}
              handleAddImages={handleAddImages}
            />
          ) : (
            <div className='rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground'>
              Select a social post to review its images.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppModal>
  );
}
