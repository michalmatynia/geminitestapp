import { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';

export type MoodEditorUpdateMoodFn = (
  moodId: AgentPersonaMoodId,
  updater: (mood: AgentPersonaMood) => AgentPersonaMood
) => void;

export type MoodEditorDeleteAvatarFileFn = (fileId: string | null | undefined) => Promise<void>;
export type MoodEditorDeleteAvatarThumbnailFn = (thumbnailRef: string | null | undefined) => Promise<void>;
