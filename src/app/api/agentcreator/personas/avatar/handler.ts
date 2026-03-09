import { NextRequest, NextResponse } from 'next/server';

import {
  buildAgentPersonaAvatarThumbnail,
  deleteAgentPersonaAvatarThumbnailByRef,
  upsertAgentPersonaAvatarThumbnail,
} from '@/features/ai/agentcreator/server/persona-avatar-thumbnails';
import { uploadFile } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const MAX_AVATAR_UPLOAD_BYTES = 4 * 1024 * 1024;
const THUMBNAIL_GENERATION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry && 'size' in entry;
};

const sanitizeSegment = (value: string | null | undefined, fallback: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  return normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    throw badRequestError('Invalid form data', { error });
  }

  const entries = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('image'),
  ];
  const file = entries.find(isFileLike);

  if (!file) {
    throw badRequestError('No file provided');
  }

  const personaId = sanitizeSegment(formData.get('personaId')?.toString(), 'draft');
  const moodId = sanitizeSegment(formData.get('moodId')?.toString(), 'neutral');
  const folder = `personas/${personaId}/${moodId}`;
  const mimeType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';

  if (typeof file.size === 'number' && file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw badRequestError('Avatar image is too large. Keep uploads under 4 MB.');
  }

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const thumbnail =
    THUMBNAIL_GENERATION_MIME_TYPES.has(mimeType) && sourceBuffer.byteLength > 0
      ? await buildAgentPersonaAvatarThumbnail({
        personaId,
        moodId,
        buffer: sourceBuffer,
      })
      : null;

  const uploaded = await uploadFile(file, {
    category: 'agentcreator',
    folder,
    allowOrphanRecord: true,
  });

  if (thumbnail) {
    const persisted = await upsertAgentPersonaAvatarThumbnail(thumbnail);
    if (!persisted) {
      throw badRequestError('Failed to persist avatar thumbnail.');
    }
  }

  return NextResponse.json(
    {
      ...uploaded,
      originalName: file.name || uploaded.filename,
      folder,
      thumbnail: thumbnail
        ? {
          ref: thumbnail.ref,
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

export async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const thumbnailRef = req.nextUrl.searchParams.get('thumbnailRef');
  const normalizedRef = typeof thumbnailRef === 'string' ? thumbnailRef.trim() : '';
  if (!normalizedRef) {
    throw badRequestError('Thumbnail ref is required.');
  }

  await deleteAgentPersonaAvatarThumbnailByRef(normalizedRef);
  return new NextResponse(null, { status: 204 });
}
