import {
  base64ToFile,
  dataUrlToFile,
  isImageDataUrl,
  isInlineSvgMarkup,
} from '@/features/ai/agentcreator/utils/avatar-input';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';

import { DEFAULT_IMPORT_MIME, MIME_TO_EXTENSION } from './agent-persona-mood-editor.shared';

type RunImportPastedAvatarArgs = {
  moodId: AgentPersonaMoodId;
  rawValue: string;
  importMimeByMood: Record<string, string>;
  replaceMoodWithUpload: (moodId: AgentPersonaMoodId, file: File) => Promise<void>;
  setMoodSvgContent: (moodId: AgentPersonaMoodId, svg: string) => Promise<void>;
};

export async function runImportPastedAvatar({
  moodId,
  rawValue,
  importMimeByMood,
  replaceMoodWithUpload,
  setMoodSvgContent,
}: RunImportPastedAvatarArgs): Promise<void> {
  if (isInlineSvgMarkup(rawValue)) {
    await setMoodSvgContent(moodId, rawValue);
    return;
  }

  const mimeType = importMimeByMood[moodId] ?? DEFAULT_IMPORT_MIME;
  const fileExtension = MIME_TO_EXTENSION[mimeType] ?? 'bin';
  const baseName = `persona-${moodId}.${fileExtension}`;
  const file = isImageDataUrl(rawValue)
    ? dataUrlToFile(rawValue, baseName)
    : base64ToFile(rawValue, mimeType, baseName);
  await replaceMoodWithUpload(moodId, file);
}
