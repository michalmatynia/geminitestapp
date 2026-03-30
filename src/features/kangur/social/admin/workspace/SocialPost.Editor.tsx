'use client';

import {
  FormSection,
  Input,
  Textarea,
} from '@/features/kangur/shared/ui';
import { SocialPostVisuals } from './SocialPost.Visuals';
import { useSocialPostContext } from './SocialPostContext';

type SocialPostEditorProps = {
  showImagesPanel?: boolean;
};

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialPostEditor(props: SocialPostEditorProps): React.JSX.Element {
  const { showImagesPanel = true } = props;
  const { editorState, setEditorState, currentGenerationJob, currentPipelineJob } =
    useSocialPostContext();
  const isEditorLocked =
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const editorLockTitle = isEditorLocked
    ? 'Wait for the current Social runtime job to finish.'
    : undefined;

  return (
    <div className='space-y-4'>
      <div className='text-sm font-semibold text-foreground'>Post editor</div>

      <FormSection title='Polish' className='space-y-3'>
        <Input
          placeholder='Polish title'
          value={editorState.titlePl}
          disabled={isEditorLocked}
          title={editorLockTitle}
          onChange={(event) =>
            setEditorState((prev) => ({ ...prev, titlePl: event.target.value }))
          }
        />
        <Textarea
          placeholder='Polish body'
          rows={5}
          value={editorState.bodyPl}
          disabled={isEditorLocked}
          title={editorLockTitle}
          onChange={(event) =>
            setEditorState((prev) => ({ ...prev, bodyPl: event.target.value }))
          }
        />
      </FormSection>

      <FormSection title='English' className='space-y-3'>
        <Input
          placeholder='English title'
          value={editorState.titleEn}
          disabled={isEditorLocked}
          title={editorLockTitle}
          onChange={(event) =>
            setEditorState((prev) => ({ ...prev, titleEn: event.target.value }))
          }
        />
        <Textarea
          placeholder='English body'
          rows={5}
          value={editorState.bodyEn}
          disabled={isEditorLocked}
          title={editorLockTitle}
          onChange={(event) =>
            setEditorState((prev) => ({ ...prev, bodyEn: event.target.value }))
          }
        />
      </FormSection>

      <SocialPostVisuals showImagesPanel={showImagesPanel} />
    </div>
  );
}

export const renderSocialPostEditor = (props: SocialPostEditorProps): React.JSX.Element => (
  <SocialPostEditor {...props} />
);
