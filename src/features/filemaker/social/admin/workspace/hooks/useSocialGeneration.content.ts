import type { QueryClient } from '@tanstack/react-query';

import type {
  SocialPublishingGeneratedDraft,
  SocialPublishingPost,
} from '@/shared/contracts/social-publishing-posts';
import { normalizeSocialPublishingDraftLike } from '@/shared/lib/social-publishing-generated-draft';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type {
  GenerationJobResult,
  SocialGenerationDeps,
  SocialGenerationEditorState,
} from './useSocialGeneration.types';

export const SOCIAL_GENERATION_EMPTY_COPY_ERROR =
  'Generation completed, but no post copy was returned. Check the queued result and retry.';

export const SOCIAL_PUBLISHING_POSTS_QUERY_KEY: readonly ['social-publishing', 'posts'] = [
  'social-publishing',
  'posts',
];

type GeneratedContentFields = Pick<
  SocialPublishingGeneratedDraft | SocialPublishingPost,
  'titlePl' | 'titleEn' | 'bodyPl' | 'bodyEn'
>;

const GENERATED_COPY_FIELDS: readonly (keyof GeneratedContentFields)[] = [
  'titlePl',
  'titleEn',
  'bodyPl',
  'bodyEn',
];

const hasTrimmedText = (value: string): boolean => value.trim().length > 0;

const buildEditorState = (draftLike: GeneratedContentFields): SocialGenerationEditorState => ({
  titlePl: draftLike.titlePl,
  titleEn: draftLike.titleEn,
  bodyPl: draftLike.bodyPl,
  bodyEn: draftLike.bodyEn,
});

const syncGeneratedPostInCache = (
  queryClient: QueryClient,
  generatedPost: SocialPublishingPost
): void => {
  const postsQueryKey = QUERY_KEYS.socialPublishing.posts({
    scope: 'admin',
    limit: null,
  });
  queryClient.setQueryData<SocialPublishingPost[]>(postsQueryKey, (current) =>
    (current ?? []).map((post) => (post.id === generatedPost.id ? generatedPost : post))
  );
};

const applyGeneratedPost = ({
  deps,
  generatedPost,
  queryClient,
}: {
  deps: SocialGenerationDeps;
  generatedPost: SocialPublishingPost;
  queryClient: QueryClient;
}): void => {
  deps.setActivePostId(generatedPost.id);
  deps.setEditorState(buildEditorState(generatedPost));
  deps.setContextSummary(generatedPost.contextSummary ?? generatedPost.generatedSummary ?? null);
  syncGeneratedPostInCache(queryClient, generatedPost);
};

const applyGeneratedDraft = ({
  deps,
  draft,
}: {
  deps: SocialGenerationDeps;
  draft: SocialPublishingGeneratedDraft;
}): void => {
  deps.setEditorState(buildEditorState(draft));
  deps.setContextSummary(draft.summary ?? null);
};

export const normalizeGeneratedContent = <T extends GeneratedContentFields>(
  draftLike: T | null | undefined
): T | null => {
  if (draftLike === null || draftLike === undefined) {
    return null;
  }

  const normalized = normalizeSocialPublishingDraftLike(draftLike);
  if (normalized === null) {
    return null;
  }

  return {
    ...draftLike,
    ...normalized,
  };
};

export const hasUsableGeneratedContent = <T extends GeneratedContentFields>(
  draftLike: T | null | undefined
): draftLike is T => {
  if (draftLike === null || draftLike === undefined) {
    return false;
  }

  return GENERATED_COPY_FIELDS.some((field) => hasTrimmedText(draftLike[field]));
};

export const applyGenerationJobResult = ({
  deps,
  queryClient,
  result,
}: {
  deps: SocialGenerationDeps;
  queryClient: QueryClient;
  result: GenerationJobResult;
}): void => {
  const generatedPost = normalizeGeneratedContent(result.generatedPost);
  if (hasUsableGeneratedContent(generatedPost)) {
    applyGeneratedPost({ deps, generatedPost, queryClient });
    return;
  }

  const draft = normalizeGeneratedContent(result.draft);
  if (hasUsableGeneratedContent(draft)) {
    applyGeneratedDraft({ deps, draft });
    return;
  }

  throw new Error(SOCIAL_GENERATION_EMPTY_COPY_ERROR);
};
