'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';

import type { AgentPersonaMoodEditorProps } from './agent-persona-mood-editor.shared';
import type { MoodEditorDerived } from './use-mood-editor-persona-derived';
import {
  useMoodEditorDerived,
  useMoodEditorDraftDeletes,
  useMoodEditorEmitters,
  useMoodEditorNextMoodId,
} from './use-mood-editor-persona-derived';

export type MoodEditorPersonaData = MoodEditorDerived & {
  nextMoodId: string;
  setNextMoodId: (value: string) => void;
  importValues: Record<string, string>;
  setImportValues: Dispatch<SetStateAction<Record<string, string>>>;
  importMimeByMood: Record<string, string>;
  setImportMimeByMood: Dispatch<SetStateAction<Record<string, string>>>;
  emitMoods: (nextMoods: AgentPersonaMood[]) => void;
  updateMood: (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ) => void;
  handleDeleteAvatar: (fileId: string | null | undefined) => Promise<void>;
  handleDeleteThumbnail: (thumbnailRef: string | null | undefined) => Promise<void>;
};

export function useMoodEditorPersonaData({
  moods,
  originalMoods,
  onChange,
}: Pick<AgentPersonaMoodEditorProps, 'moods' | 'originalMoods' | 'onChange'>): MoodEditorPersonaData {
  const derived = useMoodEditorDerived(moods, originalMoods);
  const [nextMoodId, setNextMoodId] = useMoodEditorNextMoodId(derived.missingMoodPresets);
  const [importValues, setImportValues] = useState<Record<string, string>>({});
  const [importMimeByMood, setImportMimeByMood] = useState<Record<string, string>>({});
  const { emitMoods, updateMood } = useMoodEditorEmitters(onChange, derived.effectiveMoods);
  const { handleDeleteAvatar, handleDeleteThumbnail } = useMoodEditorDraftDeletes(
    derived.originalAvatarFileIds,
    derived.originalAvatarThumbnailRefs
  );
  return {
    ...derived,
    nextMoodId,
    setNextMoodId,
    importValues,
    setImportValues,
    importMimeByMood,
    setImportMimeByMood,
    emitMoods,
    updateMood,
    handleDeleteAvatar,
    handleDeleteThumbnail,
  };
}
