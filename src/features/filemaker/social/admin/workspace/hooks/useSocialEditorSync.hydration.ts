import { useEffect } from 'react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import { emptyEditorState, formatDatetimeLocal } from '../SocialPublishingPage.Constants';
import {
  resolvePostEditorState,
  resolvePostImageAssets,
} from './useSocialEditorSync.runtime';
import type { SocialEditorLocalState } from './useSocialEditorSync.state';

type SocialEditorHydrationParams = Pick<
  SocialEditorLocalState,
  | 'setContextSummary'
  | 'setDocReferenceInput'
  | 'setDraftImageAddonIds'
  | 'setDraftImageAssets'
  | 'setEditorState'
  | 'setHydratedDraftPostId'
  | 'setScheduledAt'
> & {
  activePost: SocialPublishingPost | null;
};

const resetSocialEditorDraft = ({
  setContextSummary,
  setDocReferenceInput,
  setDraftImageAddonIds,
  setDraftImageAssets,
  setEditorState,
  setHydratedDraftPostId,
  setScheduledAt,
}: Omit<SocialEditorHydrationParams, 'activePost'>): void => {
  setEditorState(emptyEditorState);
  setScheduledAt('');
  setDocReferenceInput('');
  setDraftImageAssets([]);
  setDraftImageAddonIds([]);
  setHydratedDraftPostId(null);
  setContextSummary(null);
};

const hydrateSocialEditorDraft = ({
  activePost,
  setContextSummary,
  setDocReferenceInput,
  setDraftImageAddonIds,
  setDraftImageAssets,
  setEditorState,
  setHydratedDraftPostId,
  setScheduledAt,
}: SocialEditorHydrationParams & {
  activePost: SocialPublishingPost;
}): void => {
  setEditorState(resolvePostEditorState(activePost));
  setScheduledAt(formatDatetimeLocal(activePost.scheduledAt));
  setDocReferenceInput(activePost.docReferences.join(', '));
  setDraftImageAddonIds(activePost.imageAddonIds);
  setDraftImageAssets(resolvePostImageAssets(activePost));
  setHydratedDraftPostId(activePost.id);
  setContextSummary(activePost.contextSummary);
};

export const useSocialEditorHydration = (
  params: SocialEditorHydrationParams
): void => {
  const {
    activePost,
    setContextSummary,
    setDocReferenceInput,
    setDraftImageAddonIds,
    setDraftImageAssets,
    setEditorState,
    setHydratedDraftPostId,
    setScheduledAt,
  } = params;

  useEffect(() => {
    const setters = {
      setContextSummary,
      setDocReferenceInput,
      setDraftImageAddonIds,
      setDraftImageAssets,
      setEditorState,
      setHydratedDraftPostId,
      setScheduledAt,
    };
    if (activePost === null) {
      resetSocialEditorDraft(setters);
      return;
    }
    hydrateSocialEditorDraft({ ...setters, activePost });
  }, [
    activePost,
    setContextSummary,
    setDocReferenceInput,
    setDraftImageAddonIds,
    setDraftImageAssets,
    setEditorState,
    setHydratedDraftPostId,
    setScheduledAt,
  ]);
};
