import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildAgentPersonaAvatarThumbnail,
  deleteAgentPersonaAvatarThumbnailByRef,
  upsertAgentPersonaAvatarThumbnail,
} from '@/features/ai/agentcreator/server/persona-avatar-thumbnails';
import { uploadFile } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { logger } from '@/shared/utils/logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const MAX_AVATAR_UPLOAD_BYTES = 4 * 1024 * 1024;
export const deleteQuerySchema = z.object({
  thumbnailRef: optionalTrimmedQueryString(),
});
const THUMBNAIL_GENERATION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && 'arrayBuffer' in entry && 'size' in entry;
};

const sanitizeSegment = (value: string | null | undefined, fallback: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0) return fallback;
  return normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
};

const resolveUploadedFile = (formData: FormData): File => {
  const entries = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('image'),
  ];
  const file = entries.find(isFileLike);

  if (!file) {
    throw badRequestError('No file provided');
  }

  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw badRequestError('Avatar image is too large. Keep uploads under 4 MB.');
  }

  return file;
};

const resolveThumbnail = async (input: {
  personaId: string;
  moodId: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<Awaited<ReturnType<typeof buildAgentPersonaAvatarThumbnail>> | null> => {
  const { personaId, moodId, mimeType, buffer } = input;
  if (!(THUMBNAIL_GENERATION_MIME_TYPES.has(mimeType) && buffer.byteLength > 0)) {
    return null;
  }

  try {
    const thumbnail = await buildAgentPersonaAvatarThumbnail({
      personaId,
      moodId,
      buffer,
    });

    const persisted = await upsertAgentPersonaAvatarThumbnail(thumbnail);
    if (!persisted) {
      logger.warn(
        '[agentcreator.personas.avatar] thumbnail persistence failed; continuing without embedded thumbnail',
        {
          service: 'agentcreator.personas',
          context: {
            personaId,
            moodId,
            mimeType,
            thumbnailRef: thumbnail.ref,
          },
        }
      );
      return null;
    }

    return thumbnail;
  } catch (error) {
    await ErrorSystem.captureException(error);
    logger.warn(
      '[agentcreator.personas.avatar] thumbnail generation failed; continuing without embedded thumbnail',
      {
        service: 'agentcreator.personas',
        context: {
          personaId,
          moodId,
          mimeType,
          bytes: buffer.byteLength,
        },
        error,
      }
    );
    return null;
  }
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    await ErrorSystem.captureException(error);
    throw badRequestError('Invalid form data', { error });
  }

  const file = resolveUploadedFile(formData);
  const personaId = sanitizeSegment(formData.get('personaId')?.toString(), 'draft');
  const moodId = sanitizeSegment(formData.get('moodId')?.toString(), 'neutral');
  const folder = `personas/${personaId}/${moodId}`;
  const mimeType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const thumbnail = await resolveThumbnail({
    personaId,
    moodId,
    mimeType,
    buffer: sourceBuffer,
  });

  const uploaded = await uploadFile(file, {
    category: 'agentcreator',
    folder,
    allowOrphanRecord: true,
  });

  return NextResponse.json(
    {
      ...uploaded,
      originalName: (file.name.length > 0 ? file.name : uploaded.filename),
      folder,
      thumbnail: thumbnail
        ? {
          ref: thumbnail.ref,
          dataUrl: thumbnail.dataUrl,
          mimeType: thumbnail.mimeType,
          bytes: thumbnail.bytes,
          width: thumbnail.width,
          height: thumbnail.height,
        }
        : null,
    },
    { status: 201 }
  );
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const normalizedRef = query.thumbnailRef ?? '';
  if (normalizedRef.length === 0) {
    throw badRequestError('Thumbnail ref is required.');
  }

  await deleteAgentPersonaAvatarThumbnailByRef(normalizedRef);
  return new NextResponse(null, { status: 204 });
}
