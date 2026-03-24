'use client';
import {
  Button,
  FormSection,
  Input,
  Textarea,
} from '@/features/kangur/shared/ui';
import { SocialPostVisuals } from './SocialPost.Visuals';
import { useSocialPostContext } from './SocialPostContext';

export function SocialPostEditor({ showImagesPanel = true }: { showImagesPanel?: boolean }) {
  const {
    activePost,
    editorState,
    setEditorState,
    handleSave,
    handlePublish,
    saveMutation,
    publishMutation,
  } = useSocialPostContext();

  return (
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

      <SocialPostVisuals showImagesPanel={showImagesPanel} />

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
            void handlePublish();
          }}
          disabled={!activePost || publishMutation.isPending}
        >
          {publishMutation.isPending ? 'Publishing...' : 'Publish to LinkedIn'}
        </Button>
      </div>
    </div>
  );
}
