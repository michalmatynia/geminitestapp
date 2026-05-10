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
  if (normalized.length === 0) {
    return fallback;
  }
  return normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
};

const normalizePositiveInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readStringField = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
};

const hasCompleteThumbnailFields = (record: {
  ref: string;
  personaId: string;
  moodId: string;
  dataUrl: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  hash: string;
}): boolean =>
  record.ref.length > 0 &&
  record.personaId.length > 0 &&
  record.moodId.length > 0 &&
  record.dataUrl.length > 0 &&
  record.width !== null &&
  record.height !== null &&
  record.bytes !== null &&
  record.hash.length > 0;

const normalizeThumbnailRecord = (value: unknown): AgentPersonaAvatarThumbnailRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const parsed = {
    ref: readStringField(value, 'ref'),
    personaId: readStringField(value, 'personaId'),
    moodId: readStringField(value, 'moodId'),
    dataUrl: readStringField(value, 'dataUrl'),
    width: normalizePositiveInt(value['width']),
    height: normalizePositiveInt(value['height']),
    bytes: normalizePositiveInt(value['bytes']),
    hash: readStringField(value, 'hash'),
  };
  if (!hasCompleteThumbnailFields(parsed)) {
    return null;
  }

  const updatedAt = readStringField(value, 'updatedAt');
  return {
    ref: parsed.ref,
    personaId: parsed.personaId,
    moodId: parsed.moodId,
    dataUrl: parsed.dataUrl,
    mimeType: value['mimeType'] === 'image/png' ? 'image/png' : 'image/webp',
    width: parsed.width,
    height: parsed.height,
    bytes: parsed.bytes,
    hash: parsed.hash,
    updatedAt: updatedAt.length > 0 ? updatedAt : new Date().toISOString(),
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
  if (normalizedRef.length === 0) {
    return null;
  }
  const raw = await readStoredSettingValue(toThumbnailSettingKey(normalizedRef));
  if (raw === null || raw.trim().length === 0) {
    return null;
  }
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
  if (normalizedRef.length === 0) {
    return false;
  }
  return deleteStoredSettingValue(toThumbnailSettingKey(normalizedRef));
};

const buildOptimizedThumbnailBuffer = async (buffer: Buffer, quality: number): Promise<Buffer> =>
  sharp(buffer)
    .rotate()
    .resize(PERSONA_AVATAR_THUMBNAIL_SIZE_PX, PERSONA_AVATAR_THUMBNAIL_SIZE_PX, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality })
    .toBuffer();

export const buildAgentPersonaAvatarThumbnail = async (input: {
  personaId: string;
  moodId: string;
  buffer: Buffer;
}): Promise<AgentPersonaAvatarThumbnailRecord> => {
  const optimizedBuffers = await Promise.all(
    [78, 72, 64, 56].map((quality) => buildOptimizedThumbnailBuffer(input.buffer, quality))
  );
  const preferredBuffer = optimizedBuffers.find(
    (candidate) => candidate.byteLength <= PERSONA_AVATAR_THUMBNAIL_PREFERRED_BYTES
  );
  const thumbnailBuffer = preferredBuffer ?? optimizedBuffers.find(
    (candidate) => candidate.byteLength <= MAX_PERSONA_AVATAR_THUMBNAIL_BYTES
  );
  if (thumbnailBuffer === undefined) {
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
