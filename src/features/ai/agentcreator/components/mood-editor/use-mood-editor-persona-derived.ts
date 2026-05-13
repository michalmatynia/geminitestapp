'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AGENT_PERSONA_MOOD_PRESETS,
  buildDefaultAgentPersonaMoods,
  collectAgentPersonaAvatarFileIds,
  collectAgentPersonaAvatarThumbnailRefs,
} from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import { DEFAULT_AGENT_PERSONA_MOOD_ID } from '@/shared/contracts/agents';

import type { AgentPersonaMoodEditorProps } from './agent-persona-mood-editor.shared';
import { sortMoods } from './agent-persona-mood-editor.shared';
import { deleteDraftAvatarFile, deleteDraftAvatarThumbnail } from './utils';

export type MoodEditorDerived = {
  effectiveMoods: AgentPersonaMood[];
  originalAvatarFileIds: Set<string>;
  originalAvatarThumbnailRefs: Set<string>;
  missingMoodPresets: (typeof AGENT_PERSONA_MOOD_PRESETS)[number][];
};

export function useMoodEditorDerived(
  moods: AgentPersonaMood[] | null | undefined,
  originalMoods: AgentPersonaMood[] | null | undefined
): MoodEditorDerived {
  const effectiveMoods = useMemo(
    () =>
      Array.isArray(moods) && moods.length > 0 ? sortMoods(moods) : buildDefaultAgentPersonaMoods(),
    [moods]
  );
  const originalAvatarFileIds = useMemo(
    () => new Set(collectAgentPersonaAvatarFileIds({ moods: originalMoods ?? [] })),
    [originalMoods]
  );
  const originalAvatarThumbnailRefs = useMemo(
    () => new Set(collectAgentPersonaAvatarThumbnailRefs({ moods: originalMoods ?? [] })),
    [originalMoods]
  );
  const missingMoodPresets = useMemo(
    () =>
      AGENT_PERSONA_MOOD_PRESETS.filter(
        (preset) => !effectiveMoods.some((mood) => mood.id === preset.id)
      ),
    [effectiveMoods]
  );

  return { effectiveMoods, originalAvatarFileIds, originalAvatarThumbnailRefs, missingMoodPresets };
}

export function useMoodEditorNextMoodId(
  missingMoodPresets: MoodEditorDerived['missingMoodPresets']
): [string, (value: string) => void] {
  const [nextMoodId, setNextMoodId] = useState<string>(missingMoodPresets[0]?.id ?? '');

  useEffect(() => {
    setNextMoodId((current) => {
      const currentIsValid =
        current.length > 0 && missingMoodPresets.some((preset) => preset.id === current);
      if (currentIsValid) {
        return current;
      }

      return missingMoodPresets[0]?.id ?? '';
    });
  }, [missingMoodPresets]);

  return [nextMoodId, setNextMoodId];
}

export function useMoodEditorEmitters(
  onChange: AgentPersonaMoodEditorProps['onChange'],
  effectiveMoods: AgentPersonaMood[]
): {
  emitMoods: (nextMoods: AgentPersonaMood[]) => void;
  updateMood: (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ) => void;
} {
  const emitMoods = useCallback(
    (nextMoods: AgentPersonaMood[]): void => {
      onChange({
        moods: sortMoods(nextMoods),
        defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
      });
    },
    [onChange]
  );

  const updateMood = useCallback(
    (
      moodId: AgentPersonaMoodId,
      updater: (mood: AgentPersonaMood) => AgentPersonaMood
    ): void => {
      emitMoods(
        effectiveMoods.map((candidate) => (candidate.id === moodId ? updater(candidate) : candidate))
      );
    },
    [effectiveMoods, emitMoods]
  );

  return { emitMoods, updateMood };
}

export function useMoodEditorDraftDeletes(
  originalAvatarFileIds: Set<string>,
  originalAvatarThumbnailRefs: Set<string>
): {
  handleDeleteAvatar: (fileId: string | null | undefined) => Promise<void>;
  handleDeleteThumbnail: (thumbnailRef: string | null | undefined) => Promise<void>;
} {
  const handleDeleteAvatar = useCallback(
    async (fileId: string | null | undefined): Promise<void> => {
      await deleteDraftAvatarFile(fileId, originalAvatarFileIds);
    },
    [originalAvatarFileIds]
  );

  const handleDeleteThumbnail = useCallback(
    async (thumbnailRef: string | null | undefined): Promise<void> => {
      await deleteDraftAvatarThumbnail(thumbnailRef, originalAvatarThumbnailRefs);
    },
    [originalAvatarThumbnailRefs]
  );

  return { handleDeleteAvatar, handleDeleteThumbnail };
}
