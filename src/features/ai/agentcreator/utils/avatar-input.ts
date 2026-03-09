import { api } from '@/shared/lib/api-client';
import type { ImageFileRecord } from '@/shared/contracts/files';

const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.+)$/i;

export const isInlineSvgMarkup = (value: string): boolean => /<svg[\s>]/i.test(value.trim());

export const isImageDataUrl = (value: string): boolean =>
  /^data:image\/[^;]+;base64,/i.test(value.trim());

export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const match = dataUrl.trim().match(DATA_URL_PATTERN);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  const mimeType = (match[1] ?? '').trim().toLowerCase();
  const base64 = match[2] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mimeType || 'application/octet-stream' });
};

export const base64ToFile = (base64: string, mimeType: string, filename: string): File =>
  dataUrlToFile(`data:${mimeType};base64,${base64.trim()}`, filename);

export type PersonaAvatarUploadResult = ImageFileRecord & {
  originalName: string;
  folder: string;
  thumbnail: {
    ref: string;
    mimeType: string;
    bytes: number;
    width: number;
    height: number;
  } | null;
};

export async function uploadPersonaAvatar(input: {
  file: File;
  personaId?: string | null;
  moodId: string;
}): Promise<PersonaAvatarUploadResult> {
  const formData = new FormData();
  formData.set('file', input.file);
  formData.set('moodId', input.moodId);
  if (input.personaId?.trim()) {
    formData.set('personaId', input.personaId.trim());
  }

  return api.post<PersonaAvatarUploadResult>('/api/agentcreator/personas/avatar', formData);
}

export async function deletePersonaAvatar(fileId: string): Promise<void> {
  const normalized = fileId.trim();
  if (!normalized) return;
  await api.delete(`/api/files/${encodeURIComponent(normalized)}`);
}

export async function deletePersonaAvatarThumbnail(thumbnailRef: string): Promise<void> {
  const normalized = thumbnailRef.trim();
  if (!normalized) return;
  await api.delete(
    `/api/agentcreator/personas/avatar?thumbnailRef=${encodeURIComponent(normalized)}`
  );
}
