import type { PersonaAvatarUploadResult } from '@/features/ai/agentcreator/utils/avatar-input';
import type { AgentPersonaMood } from '@/shared/contracts/agents';

function moodFieldsFromThumbnail(
  thumbnail: PersonaAvatarUploadResult['thumbnail']
): Pick<
  AgentPersonaMood,
  | 'avatarThumbnailRef'
  | 'avatarThumbnailDataUrl'
  | 'avatarThumbnailMimeType'
  | 'avatarThumbnailBytes'
  | 'avatarThumbnailWidth'
  | 'avatarThumbnailHeight'
  | 'useEmbeddedThumbnail'
> {
  if (thumbnail === null) {
    return {
      avatarThumbnailRef: null,
      avatarThumbnailDataUrl: null,
      avatarThumbnailMimeType: null,
      avatarThumbnailBytes: null,
      avatarThumbnailWidth: null,
      avatarThumbnailHeight: null,
      useEmbeddedThumbnail: false,
    };
  }

  const dataUrl = thumbnail.dataUrl;
  return {
    avatarThumbnailRef: thumbnail.ref,
    avatarThumbnailDataUrl: thumbnail.dataUrl,
    avatarThumbnailMimeType: thumbnail.mimeType,
    avatarThumbnailBytes: thumbnail.bytes,
    avatarThumbnailWidth: thumbnail.width,
    avatarThumbnailHeight: thumbnail.height,
    useEmbeddedThumbnail: dataUrl.length > 0,
  };
}

export function mapPersonaUploadToMoodFields(uploaded: PersonaAvatarUploadResult): Partial<AgentPersonaMood> {
  return {
    svgContent: '',
    avatarImageFileId: uploaded.id,
    avatarImageUrl: uploaded.filepath,
    ...moodFieldsFromThumbnail(uploaded.thumbnail),
  };
}
