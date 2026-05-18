import type { Dispatch, SetStateAction } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import type { useSocialPublishingImageAddons } from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import type { useSocialPublishingPost } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';

import type { AddonFormState, EditorState } from '../SocialPublishingPage.Constants';

export type SocialEditorSyncDeps = {
  linkedinConnections: Array<{ id: string; hasLinkedInAccessToken?: boolean }>;
  publishingConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
};

export type SocialEditorImageHandlers = {
  handleAddImages: (filepaths: string[]) => void;
  handleRemoveImage: (id: string) => void;
  handleSelectAddon: (addon: SocialPublishingImageAddon) => void;
  handleSelectAddons: (addons: SocialPublishingImageAddon[]) => void;
  handleRemoveAddon: (addonId: string) => void;
  handleRemoveMissingAddons: () => void;
};

export type SocialEditorSyncResult = SocialEditorImageHandlers & {
  posts: SocialPublishingPost[];
  recentAddons: SocialPublishingImageAddon[];
  activePostId: string | null;
  setActivePostId: Dispatch<SetStateAction<string | null>>;
  activePost: SocialPublishingPost | null;
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
  scheduledAt: string;
  setScheduledAt: Dispatch<SetStateAction<string>>;
  docReferenceInput: string;
  setDocReferenceInput: Dispatch<SetStateAction<string>>;
  generationNotes: string;
  setGenerationNotes: Dispatch<SetStateAction<string>>;
  imageAssets: ImageFileSelection[];
  setImageAssets: Dispatch<SetStateAction<ImageFileSelection[]>>;
  imageAddonIds: string[];
  missingSelectedImageAddonIds: string[];
  setImageAddonIds: Dispatch<SetStateAction<string[]>>;
  addonForm: AddonFormState;
  setAddonForm: Dispatch<SetStateAction<AddonFormState>>;
  showMediaLibrary: boolean;
  setShowMediaLibrary: Dispatch<SetStateAction<boolean>>;
  contextSummary: string | null;
  setContextSummary: Dispatch<SetStateAction<string | null>>;
  hasUnsavedChanges: boolean;
  resolveDocReferences: () => string[];
  postsQuery: ReturnType<typeof useSocialPublishingPost>;
  addonsQuery: ReturnType<typeof useSocialPublishingImageAddons>;
};
