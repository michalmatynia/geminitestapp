import { createHash } from 'node:crypto';

import sharp from 'sharp';

import {
  deleteStoredSettingValue,
  readStoredSettingValue,
  upsertStoredSettingValue,
} from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type AgentPersonaAvatarThumbnailRecord = {
  ref: string;
  personaId: string;
  moodId: string;
  dataUrl: string;
  mimeType: 'image/webp' | 'image/png';
  width: number;
  height: number;
  bytes: number;
  hash: string;
  updatedAt: string;
};

const AGENT_PERSONA_AVATAR_THUMBNAIL_KEY_PREFIX = 'agent_persona_avatar_thumbnail_v1:';
const PERSONA_AVATAR_THUMBNAIL_SIZE_PX = 96;
const MAX_PERSONA_AVATAR_THUMBNAIL_BYTES = 16 * 1024;
const PERSONA_AVATAR_THUMBNAIL_PREFERRED_BYTES = 12 * 1024;

const sanitizeSegment = (value: string | null | undefined, fallback: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  return normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
};

const normalizePositiveInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;

const normalizeThumbnailRecord = (value: unknown): AgentPersonaAvatarThumbnailRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const ref = typeof record['ref'] === 'string' ? record['ref'].trim() : '';
  const personaId = typeof record['personaId'] === 'string' ? record['personaId'].trim() : '';
  const moodId = typeof record['moodId'] === 'string' ? record['moodId'].trim() : '';
  const dataUrl = typeof record['dataUrl'] === 'string' ? record['dataUrl'].trim() : '';
  const mimeType = record['mimeType'] === 'image/png' ? 'image/png' : 'image/webp';
  const width = normalizePositiveInt(record['width']);
  const height = normalizePositiveInt(record['height']);
  const bytes = normalizePositiveInt(record['bytes']);
  const hash = typeof record['hash'] === 'string' ? record['hash'].trim() : '';
  const updatedAt = typeof record['updatedAt'] === 'string' ? record['updatedAt'].trim() : '';

  if (!ref || !personaId || !moodId || !dataUrl || !width || !height || !bytes || !hash) {
    return null;
  }

  return {
    ref,
    personaId,
    moodId,
    dataUrl,
    mimeType,
    width,
    height,
    bytes,
    hash,
    updatedAt: updatedAt || new Date().toISOString(),
  };
};

export const buildAgentPersonaAvatarThumbnailRef = (
  personaId: string,
  moodId: string,
  hash: string
): string => {
  const safePersonaId = sanitizeSegment(personaId, 'draft');
  const safeMoodId = sanitizeSegment(moodId, 'neutral');
  const safeHash = sanitizeSegment(hash.slice(0, 12), 'hash');
  const nonce = Date.now().toString(36);
  const salt = Math.random().toString(36).slice(2, 8);
  return `${safePersonaId}:${safeMoodId}:${safeHash}:${nonce}:${salt}`;
};

const toThumbnailSettingKey = (ref: string): string =>
  `${AGENT_PERSONA_AVATAR_THUMBNAIL_KEY_PREFIX}${ref}`;

export const readAgentPersonaAvatarThumbnailByRef = async (
  ref: string | null | undefined
): Promise<AgentPersonaAvatarThumbnailRecord | null> => {
  const normalizedRef = typeof ref === 'string' ? ref.trim() : '';
  if (!normalizedRef) return null;
  const raw = await readStoredSettingValue(toThumbnailSettingKey(normalizedRef));
  if (!raw?.trim()) return null;
  try {
    return normalizeThumbnailRecord(JSON.parse(raw));
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const upsertAgentPersonaAvatarThumbnail = async (
  record: AgentPersonaAvatarThumbnailRecord
): Promise<boolean> =>
  upsertStoredSettingValue(toThumbnailSettingKey(record.ref), JSON.stringify(record));

export const deleteAgentPersonaAvatarThumbnailByRef = async (
  ref: string | null | undefined
): Promise<boolean> => {
  const normalizedRef = typeof ref === 'string' ? ref.trim() : '';
  if (!normalizedRef) return false;
  return deleteStoredSettingValue(toThumbnailSettingKey(normalizedRef));
};

export const buildAgentPersonaAvatarThumbnail = async (input: {
  personaId: string;
  moodId: string;
  buffer: Buffer;
}): Promise<AgentPersonaAvatarThumbnailRecord> => {
  const optimizedBuffers: Buffer[] = [];
  for (const quality of [78, 72, 64, 56]) {
    const output = await sharp(input.buffer)
      .rotate()
      .resize(PERSONA_AVATAR_THUMBNAIL_SIZE_PX, PERSONA_AVATAR_THUMBNAIL_SIZE_PX, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality })
      .toBuffer();

    optimizedBuffers.push(output);
    if (output.byteLength <= PERSONA_AVATAR_THUMBNAIL_PREFERRED_BYTES) {
      break;
    }
  }

  const thumbnailBuffer = optimizedBuffers.find(
    (candidate) => candidate.byteLength <= MAX_PERSONA_AVATAR_THUMBNAIL_BYTES
  );
  if (!thumbnailBuffer) {
    throw new Error(
      'Avatar thumbnail is too large after optimization. Upload a simpler image with less detail.'
    );
  }

  const hash = createHash('sha256').update(thumbnailBuffer).digest('hex');
  const ref = buildAgentPersonaAvatarThumbnailRef(input.personaId, input.moodId, hash);
  const updatedAt = new Date().toISOString();

  return {
    ref,
    personaId: input.personaId.trim(),
    moodId: input.moodId.trim(),
    dataUrl: `data:image/webp;base64,${thumbnailBuffer.toString('base64')}`,
    mimeType: 'image/webp',
    width: PERSONA_AVATAR_THUMBNAIL_SIZE_PX,
    height: PERSONA_AVATAR_THUMBNAIL_SIZE_PX,
    bytes: thumbnailBuffer.byteLength,
    hash,
    updatedAt,
  };
};
