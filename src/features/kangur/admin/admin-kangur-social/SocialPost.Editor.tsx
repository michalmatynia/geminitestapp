'use client';

import React from 'react';
import {
  Button,
  FormSection,
  Input,
  Textarea,
} from '@/features/kangur/shared/ui';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { SocialPostVisuals } from './SocialPost.Visuals';

type SocialPostEditorState = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
};

export type SocialPostEditorProps = {
  activePost: KangurSocialPost | null;
  editorState: SocialPostEditorState;
  setEditorState: React.Dispatch<React.SetStateAction<SocialPostEditorState>>;
  scheduledAt: string;
  setScheduledAt: React.Dispatch<React.SetStateAction<string>>;
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  recentAddons: KangurSocialImageAddon[];
  recentAddonsLoading: boolean;
  selectedAddonSet: Set<string>;
  handleSelectAddon: (addon: KangurSocialImageAddon) => void;
  handleRemoveAddon: (id: string) => void;
  handleSave: (status: KangurSocialPost['status']) => Promise<void>;
  handlePublish: () => Promise<void>;
  saveMutationPending: boolean;
  patchMutationPending: boolean;
  publishMutationPending: boolean;
  showImagesPanel?: boolean;
};

export function SocialPostEditor({
  activePost,
  editorState,
  setEditorState,
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
  recentAddons,
  recentAddonsLoading,
  selectedAddonSet,
  handleSelectAddon,
  handleRemoveAddon,
  handleSave,
  handlePublish,
  saveMutationPending,
  publishMutationPending,
  showImagesPanel = true,
}: SocialPostEditorProps) {
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

      <SocialPostVisuals
        activePost={activePost}
        recentAddons={recentAddons}
        recentAddonsLoading={recentAddonsLoading}
        selectedAddonSet={selectedAddonSet}
        handleSelectAddon={handleSelectAddon}
        handleRemoveAddon={handleRemoveAddon}
        imageAssets={imageAssets}
        handleRemoveImage={handleRemoveImage}
        setShowMediaLibrary={setShowMediaLibrary}
        showMediaLibrary={showMediaLibrary}
        handleAddImages={handleAddImages}
        showImagesPanel={showImagesPanel}
      />

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={() => {
            void handleSave('draft');
          }}
          disabled={!activePost || saveMutationPending}
        >
          {saveMutationPending ? 'Saving...' : 'Save draft'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void handlePublish();
          }}
          disabled={!activePost || publishMutationPending}
        >
          {publishMutationPending ? 'Publishing...' : 'Publish to LinkedIn'}
        </Button>
      </div>
    </div>
  );
}
