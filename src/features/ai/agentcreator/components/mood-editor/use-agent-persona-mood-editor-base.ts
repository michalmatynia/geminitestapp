'use client';

import { useToast } from '@/shared/ui/primitives.public';

import type { AgentPersonaMoodEditorController } from './agent-persona-mood-editor-controller.types';
import type { AgentPersonaMoodEditorProps } from './agent-persona-mood-editor.shared';
import { useMoodEditorPersonaData } from './use-mood-editor-persona-data';
import {
  useMoodEditorClearSvgMutations,
  useMoodEditorImportFlow,
  useMoodEditorRemoveMood,
  useMoodEditorReplaceUpload,
  useMoodEditorToggleEmbedded,
  useMoodEditorUploadFlow,
} from './use-mood-editor-persona-handlers';

export function useAgentPersonaMoodEditorBase(
  props: AgentPersonaMoodEditorProps
): Omit<AgentPersonaMoodEditorController, 'logUploadError'> {
  const { toast } = useToast();
  const data = useMoodEditorPersonaData(props);
  const replaceMoodWithUpload = useMoodEditorReplaceUpload({
    effectiveMoods: data.effectiveMoods,
    personaId: props.personaId,
    updateMood: data.updateMood,
    handleDeleteAvatar: data.handleDeleteAvatar,
    handleDeleteThumbnail: data.handleDeleteThumbnail,
  });
  const { clearMoodImage, setMoodSvgContent } = useMoodEditorClearSvgMutations(
    data.effectiveMoods,
    data.updateMood,
    data.handleDeleteAvatar,
    data.handleDeleteThumbnail
  );
  const toggleEmbeddedThumbnail = useMoodEditorToggleEmbedded(data.updateMood);
  const handleMoodAssetUpload = useMoodEditorUploadFlow(replaceMoodWithUpload, toast);
  const handleImportSubmit = useMoodEditorImportFlow({
    importValues: data.importValues,
    importMimeByMood: data.importMimeByMood,
    setImportValues: data.setImportValues,
    replaceMoodWithUpload,
    setMoodSvgContent,
    toast,
  });
  const handleRemoveMood = useMoodEditorRemoveMood(
    data.effectiveMoods,
    data.emitMoods,
    data.handleDeleteAvatar,
    data.handleDeleteThumbnail
  );
  return {
    effectiveMoods: data.effectiveMoods,
    originalAvatarFileIds: data.originalAvatarFileIds,
    originalAvatarThumbnailRefs: data.originalAvatarThumbnailRefs,
    missingMoodPresets: data.missingMoodPresets,
    nextMoodId: data.nextMoodId,
    setNextMoodId: data.setNextMoodId,
    importValues: data.importValues,
    setImportValues: data.setImportValues,
    importMimeByMood: data.importMimeByMood,
    setImportMimeByMood: data.setImportMimeByMood,
    emitMoods: data.emitMoods,
    handleMoodAssetUpload,
    handleImportSubmit,
    clearMoodImage,
    setMoodSvgContent,
    toggleEmbeddedThumbnail,
    handleRemoveMood,
  };
}
