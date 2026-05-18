import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import type { SocialEditorImagesState } from './useSocialEditorSync.images';
import type { SocialEditorLocalState } from './useSocialEditorSync.state';
import type { SocialEditorSyncResult } from './useSocialEditorSync.types';

export const buildSocialEditorSyncResult = ({
  activePost,
  hasUnsavedChanges,
  images,
  posts,
  postsQuery,
  resolveDocReferences,
  state,
}: {
  activePost: SocialPublishingPost | null;
  hasUnsavedChanges: boolean;
  images: SocialEditorImagesState;
  posts: SocialPublishingPost[];
  postsQuery: SocialEditorSyncResult['postsQuery'];
  resolveDocReferences: () => string[];
  state: SocialEditorLocalState;
}): SocialEditorSyncResult => ({
  posts,
  recentAddons: images.recentAddons,
  activePostId: state.activePostId,
  setActivePostId: state.setActivePostId,
  activePost,
  editorState: state.editorState,
  setEditorState: state.setEditorState,
  scheduledAt: state.scheduledAt,
  setScheduledAt: state.setScheduledAt,
  docReferenceInput: state.docReferenceInput,
  setDocReferenceInput: state.setDocReferenceInput,
  generationNotes: state.generationNotes,
  setGenerationNotes: state.setGenerationNotes,
  imageAssets: images.imageAssets,
  setImageAssets: state.setImageAssets,
  imageAddonIds: images.imageAddonIds,
  missingSelectedImageAddonIds: images.missingSelectedImageAddonIds,
  setImageAddonIds: state.setImageAddonIds,
  addonForm: state.addonForm,
  setAddonForm: state.setAddonForm,
  showMediaLibrary: state.showMediaLibrary,
  setShowMediaLibrary: state.setShowMediaLibrary,
  contextSummary: state.contextSummary,
  setContextSummary: state.setContextSummary,
  hasUnsavedChanges,
  resolveDocReferences,
  handleAddImages: images.handleAddImages,
  handleRemoveImage: images.handleRemoveImage,
  handleSelectAddon: images.handleSelectAddon,
  handleSelectAddons: images.handleSelectAddons,
  handleRemoveAddon: images.handleRemoveAddon,
  handleRemoveMissingAddons: images.handleRemoveMissingAddons,
  postsQuery,
  addonsQuery: images.addonsQuery,
});
