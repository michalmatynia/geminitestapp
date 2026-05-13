import {
  deletePersonaAvatar,
  deletePersonaAvatarThumbnail,
} from '@/features/ai/agentcreator/utils/avatar-input';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import type {
  MoodEditorDeleteAvatarFileFn,
  MoodEditorDeleteAvatarThumbnailFn,
  MoodEditorUpdateMoodFn,
} from './types';

export const deleteDraftAvatarFile = async (
  fileId: string | null | undefined,
  originalFileIds: Set<string>
): Promise<void> => {
  const normalizedFileId = typeof fileId === 'string' ? fileId.trim() : '';
  if (normalizedFileId.length === 0 || originalFileIds.has(normalizedFileId)) {
    return;
  }

  try {
    await deletePersonaAvatar(normalizedFileId);
  } catch (error) {
    logClientCatch(error, {
      source: 'AgentPersonaMoodEditor',
      action: 'deleteDraftAvatarFile',
      fileId: normalizedFileId,
    });
  }
};

export const deleteDraftAvatarThumbnail = async (
  thumbnailRef: string | null | undefined,
  originalThumbnailRefs: Set<string>
): Promise<void> => {
  const normalizedRef = typeof thumbnailRef === 'string' ? thumbnailRef.trim() : '';
  if (normalizedRef.length === 0 || originalThumbnailRefs.has(normalizedRef)) {
    return;
  }

  try {
    await deletePersonaAvatarThumbnail(normalizedRef);
  } catch (error) {
    logClientCatch(error, {
      source: 'AgentPersonaMoodEditor',
      action: 'deleteDraftAvatarThumbnail',
      thumbnailRef: normalizedRef,
    });
  }
};

export type ClearMoodImageInput = {
  moodId: AgentPersonaMoodId;
  currentMood: AgentPersonaMood | null;
  updateMood: MoodEditorUpdateMoodFn;
  handleDeleteAvatar: MoodEditorDeleteAvatarFileFn;
  handleDeleteThumbnail: MoodEditorDeleteAvatarThumbnailFn;
};

export const clearMoodImage = async (input: ClearMoodImageInput): Promise<void> => {
  const { moodId, currentMood, updateMood, handleDeleteAvatar, handleDeleteThumbnail } = input;
  if (currentMood === null) {
    return;
  }

  updateMood(moodId, (mood) => ({
    ...mood,
    avatarImageFileId: null,
    avatarImageUrl: null,
    avatarThumbnailRef: null,
    avatarThumbnailDataUrl: null,
    avatarThumbnailMimeType: null,
    avatarThumbnailBytes: null,
    avatarThumbnailWidth: null,
    avatarThumbnailHeight: null,
    useEmbeddedThumbnail: false,
  }));
  await handleDeleteAvatar(currentMood.avatarImageFileId);
  await handleDeleteThumbnail(currentMood.avatarThumbnailRef);
};

export type SetMoodSvgContentInput = {
  moodId: AgentPersonaMoodId;
  svgContent: string;
  currentMood: AgentPersonaMood | null;
  updateMood: MoodEditorUpdateMoodFn;
  handleDeleteAvatar: MoodEditorDeleteAvatarFileFn;
  handleDeleteThumbnail: MoodEditorDeleteAvatarThumbnailFn;
};

export const setMoodSvgContent = async (input: SetMoodSvgContentInput): Promise<void> => {
  const { moodId, svgContent, currentMood, updateMood, handleDeleteAvatar, handleDeleteThumbnail } =
    input;
  if (currentMood === null) {
    return;
  }

  updateMood(moodId, (mood) => ({
    ...mood,
    svgContent,
    avatarImageFileId: null,
    avatarImageUrl: null,
    avatarThumbnailRef: null,
    avatarThumbnailDataUrl: null,
    avatarThumbnailMimeType: null,
    avatarThumbnailBytes: null,
    avatarThumbnailWidth: null,
    avatarThumbnailHeight: null,
    useEmbeddedThumbnail: false,
  }));
  await handleDeleteAvatar(currentMood.avatarImageFileId);
  await handleDeleteThumbnail(currentMood.avatarThumbnailRef);
};
