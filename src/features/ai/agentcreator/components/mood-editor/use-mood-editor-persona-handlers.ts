'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import { uploadPersonaAvatar } from '@/features/ai/agentcreator/utils/avatar-input';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

import { mapPersonaUploadToMoodFields } from './map-upload-to-mood-fields';
import { runImportPastedAvatar } from './run-import-pasted-avatar';
import {
  clearMoodImage as clearMoodImageOnServer,
  setMoodSvgContent as setMoodSvgContentOnServer,
} from './utils';

export type MoodEditorToast = (message: string, options?: { variant?: string }) => void;

export type MoodEditorReplaceUploadDeps = {
  effectiveMoods: AgentPersonaMood[];
  personaId: string | null | undefined;
  updateMood: (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ) => void;
  handleDeleteAvatar: (fileId: string | null | undefined) => Promise<void>;
  handleDeleteThumbnail: (thumbnailRef: string | null | undefined) => Promise<void>;
};

export function useMoodEditorReplaceUpload(
  deps: MoodEditorReplaceUploadDeps
): (moodId: AgentPersonaMoodId, file: File) => Promise<void> {
  const { effectiveMoods, personaId, updateMood, handleDeleteAvatar, handleDeleteThumbnail } = deps;
  return useCallback(
    async (moodId: AgentPersonaMoodId, file: File): Promise<void> => {
      const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
      if (currentMood === null) {
        return;
      }

      const uploaded = await uploadPersonaAvatar({
        file,
        personaId: personaId ?? null,
        moodId,
      });

      updateMood(moodId, (mood) => ({
        ...mood,
        ...mapPersonaUploadToMoodFields(uploaded),
      }));
      await handleDeleteAvatar(currentMood.avatarImageFileId);
      await handleDeleteThumbnail(currentMood.avatarThumbnailRef);
    },
    [effectiveMoods, handleDeleteAvatar, handleDeleteThumbnail, personaId, updateMood]
  );
}

export function useMoodEditorClearSvgMutations(
  effectiveMoods: AgentPersonaMood[],
  updateMood: (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ) => void,
  handleDeleteAvatar: (fileId: string | null | undefined) => Promise<void>,
  handleDeleteThumbnail: (thumbnailRef: string | null | undefined) => Promise<void>
): {
  clearMoodImage: (moodId: AgentPersonaMoodId) => Promise<void>;
  setMoodSvgContent: (moodId: AgentPersonaMoodId, svgContent: string) => Promise<void>;
} {
  const clearMoodImage = useCallback(
    async (moodId: AgentPersonaMoodId): Promise<void> => {
      const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
      await clearMoodImageOnServer({
        moodId,
        currentMood,
        updateMood,
        handleDeleteAvatar,
        handleDeleteThumbnail,
      });
    },
    [effectiveMoods, handleDeleteAvatar, handleDeleteThumbnail, updateMood]
  );

  const setMoodSvgContent = useCallback(
    async (moodId: AgentPersonaMoodId, svgContent: string): Promise<void> => {
      const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
      await setMoodSvgContentOnServer({
        moodId,
        svgContent,
        currentMood,
        updateMood,
        handleDeleteAvatar,
        handleDeleteThumbnail,
      });
    },
    [effectiveMoods, handleDeleteAvatar, handleDeleteThumbnail, updateMood]
  );

  return { clearMoodImage, setMoodSvgContent };
}

export function useMoodEditorToggleEmbedded(
  updateMood: (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ) => void
): (moodId: AgentPersonaMoodId) => void {
  return useCallback(
    (moodId: AgentPersonaMoodId): void => {
      updateMood(moodId, (mood) => ({
        ...mood,
        useEmbeddedThumbnail: mood.useEmbeddedThumbnail !== true,
      }));
    },
    [updateMood]
  );
}

export function useMoodEditorUploadFlow(
  replaceMoodWithUpload: (moodId: AgentPersonaMoodId, file: File) => Promise<void>,
  toast: MoodEditorToast
): (moodId: AgentPersonaMoodId, files: File[]) => Promise<void> {
  return useCallback(
    async (moodId: AgentPersonaMoodId, files: File[]): Promise<void> => {
      const file = files[0];
      if (file === undefined) {
        return;
      }

      try {
        await replaceMoodWithUpload(moodId, file);
        toast('Avatar uploaded.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'AgentPersonaMoodEditor',
          action: 'uploadAvatar',
          moodId,
        });
        toast(error instanceof Error ? error.message : 'Failed to upload avatar.', {
          variant: 'error',
        });
      }
    },
    [replaceMoodWithUpload, toast]
  );
}

export type MoodEditorImportFlowDeps = {
  importValues: Record<string, string>;
  importMimeByMood: Record<string, string>;
  setImportValues: Dispatch<SetStateAction<Record<string, string>>>;
  replaceMoodWithUpload: (moodId: AgentPersonaMoodId, file: File) => Promise<void>;
  setMoodSvgContent: (moodId: AgentPersonaMoodId, svgContent: string) => Promise<void>;
  toast: MoodEditorToast;
};

export function useMoodEditorImportFlow(
  deps: MoodEditorImportFlowDeps
): (moodId: AgentPersonaMoodId) => Promise<void> {
  const { importValues, importMimeByMood, setImportValues, replaceMoodWithUpload, setMoodSvgContent, toast } =
    deps;
  return useCallback(
    async (moodId: AgentPersonaMoodId): Promise<void> => {
      const rawValue = importValues[moodId]?.trim() ?? '';
      if (rawValue.length === 0) {
        toast('Paste SVG markup, a data URL, or raw base64 first.', { variant: 'error' });
        return;
      }

      try {
        await runImportPastedAvatar({
          moodId,
          rawValue,
          importMimeByMood,
          replaceMoodWithUpload,
          setMoodSvgContent,
        });

        setImportValues((current) => ({ ...current, [moodId]: '' }));
        toast('Avatar imported.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'AgentPersonaMoodEditor',
          action: 'importAvatar',
          moodId,
        });
        toast(error instanceof Error ? error.message : 'Failed to import avatar.', {
          variant: 'error',
        });
      }
    },
    [importMimeByMood, importValues, replaceMoodWithUpload, setImportValues, setMoodSvgContent, toast]
  );
}

export function useMoodEditorRemoveMood(
  effectiveMoods: AgentPersonaMood[],
  emitMoods: (next: AgentPersonaMood[]) => void,
  handleDeleteAvatar: (fileId: string | null | undefined) => Promise<void>,
  handleDeleteThumbnail: (thumbnailRef: string | null | undefined) => Promise<void>
): (moodId: AgentPersonaMoodId) => void {
  return useCallback(
    (moodId: AgentPersonaMoodId): void => {
      const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
      emitMoods(effectiveMoods.filter((candidate) => candidate.id !== moodId));
      handleDeleteAvatar(currentMood?.avatarImageFileId).catch(() => undefined);
      handleDeleteThumbnail(currentMood?.avatarThumbnailRef).catch(() => undefined);
    },
    [effectiveMoods, emitMoods, handleDeleteAvatar, handleDeleteThumbnail]
  );
}

export function useMoodEditorUploadErrorLogger(): (
  moodId: AgentPersonaMoodId
) => (error: unknown) => void {
  return useCallback(
    (moodId: AgentPersonaMoodId) => (error: unknown) => {
      logClientError(error, {
        context: { source: 'AgentPersonaMoodEditor', action: 'uploadAvatar', moodId },
      });
    },
    []
  );
}
