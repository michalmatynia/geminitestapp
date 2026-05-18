import type { QueryClient } from '@tanstack/react-query';

import type {
  useDeleteSocialPublishingPost,
  usePatchSocialPublishingPost,
  usePublishSocialPublishingPost,
  useSaveSocialPublishingPost,
  useUnpublishSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import type {
  SocialPublishingPost,
  SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import type { useToast } from '@/shared/ui';

import type { EditorState } from '../SocialPublishingPage.Constants';

export type SocialPostCrudDeps = {
  activePost: SocialPublishingPost | null;
  activePostId: string | null;
  setActivePostId: (value: string | null | ((prev: string | null) => string | null)) => void;
  editorState: EditorState;
  scheduledAt: string;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  recentAddons: SocialPublishingImageAddon[];
  resolveDocReferences: () => string[];
  publishingConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export type SocialPostCrudMutations = {
  saveMutation: ReturnType<typeof useSaveSocialPublishingPost>;
  patchMutation: ReturnType<typeof usePatchSocialPublishingPost>;
  deleteMutation: ReturnType<typeof useDeleteSocialPublishingPost>;
  publishMutation: ReturnType<typeof usePublishSocialPublishingPost>;
  unpublishMutation: ReturnType<typeof useUnpublishSocialPublishingPost>;
};

export type SocialPostCrudState = {
  deleteError: string | null;
  setDeleteError: (message: string | null) => void;
  publishingPostId: string | null;
  setPublishingPostId: (postId: string | null) => void;
  unpublishingPostId: string | null;
  setUnpublishingPostId: (postId: string | null) => void;
};

export type SocialPostCrudCache = {
  queryClient: QueryClient;
  syncPostInCache: (post: SocialPublishingPost) => void;
  recoverRefreshedPost: (postId: string) => Promise<SocialPublishingPost | null>;
};

export type SocialPostCrudToast = ReturnType<typeof useToast>['toast'];

export type BuildValidatedPostUpdates = (
  nextStatus: SocialPublishingPost['status']
) => Partial<SocialPublishingPost> | null;

export type SocialPostCrudResult = SocialPostCrudMutations & {
  deleteError: string | null;
  clearDeleteError: () => void;
  publishingPostId: string | null;
  unpublishingPostId: string | null;
  handleCreateDraft: () => Promise<SocialPublishingPost | null>;
  handleDeletePost: (postId: string) => Promise<void>;
  handleQuickPublishPost: (
    postId: string,
    mode?: SocialPublishingPublishMode,
    options?: { skipImages?: boolean }
  ) => Promise<void>;
  handleUnpublishPost: (postId: string, options?: { keepLocal?: boolean }) => Promise<void>;
  handleSave: (nextStatus: SocialPublishingPost['status']) => Promise<void>;
  handlePublish: () => Promise<void>;
};
