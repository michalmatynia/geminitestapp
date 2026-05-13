import type { Dispatch, SetStateAction } from 'react';

import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';

import type { MoodEditorDerived } from './use-mood-editor-persona-derived';

export type AgentPersonaMoodEditorController = MoodEditorDerived & {
  nextMoodId: string;
  setNextMoodId: (value: string) => void;
  importValues: Record<string, string>;
  setImportValues: Dispatch<SetStateAction<Record<string, string>>>;
  importMimeByMood: Record<string, string>;
  setImportMimeByMood: Dispatch<SetStateAction<Record<string, string>>>;
  emitMoods: (nextMoods: AgentPersonaMood[]) => void;
  handleMoodAssetUpload: (moodId: AgentPersonaMoodId, files: File[]) => Promise<void>;
  handleImportSubmit: (moodId: AgentPersonaMoodId) => Promise<void>;
  clearMoodImage: (moodId: AgentPersonaMoodId) => Promise<void>;
  setMoodSvgContent: (moodId: AgentPersonaMoodId, svgContent: string) => Promise<void>;
  toggleEmbeddedThumbnail: (moodId: AgentPersonaMoodId) => void;
  handleRemoveMood: (moodId: AgentPersonaMoodId) => void;
  logUploadError: (moodId: AgentPersonaMoodId) => (error: unknown) => void;
};
