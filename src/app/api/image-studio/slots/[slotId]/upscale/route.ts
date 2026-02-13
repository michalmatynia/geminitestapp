export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import { upsertImageStudioSlotLink } from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import { getDiskPathFromPublicPath, getImageFileRepository } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  mode: z.enum(['client_data_url', 'server_sharp']).default('server_sharp'),
  scale: z.number().finite().gt(1).max(8).default(2),
  smoothingQuality: z.enum(['low', 'medium', 'high']).optional(),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
});

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'upscale');
type SourceSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch {
    return null;
  }
}

function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('avif')) return '.avif';
  return '.png';
}

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizePublicPath(filepath: string): string {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

async function loadSourceBuffer(slot: SourceSlotRecord): Promise<Buffer> {
  const base64Candidate =
    typeof slot.imageBase64 === 'string' && slot.imageBase64.trim().startsWith('data:')
      ? slot.imageBase64.trim()
      : null;
  if (base64Candidate) {
    const parsed = parseDataUrl(base64Candidate);
    if (parsed) return parsed.buffer;
  }

  const sourcePath = slot.imageFile?.filepath ?? slot.imageUrl ?? null;
  if (!sourcePath) {
    throw badRequestError('Slot has no source image to upscale.');
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw badRequestError('Slot source image path is invalid.');
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const response = await fetch(normalizedPath);
    if (!response.ok) {
      throw badRequestError(`Failed to fetch source image (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const diskPath = getDiskPathFromPublicPath(normalizedPath);
  return fs.readFile(diskPath);
}

function formatScaleLabel(scale: number): string {
  return `${Number(scale.toFixed(2))}x`;
}

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) throw badRequestError('Slot id is required.');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) throw notFoundError('Source slot not found.');
  const payload = parsed.data;

  if (payload.mode === 'client_data_url' && !payload.dataUrl) {
    throw badRequestError('Client upscale requires dataUrl.');
  }

  let outputBuffer: Buffer;
  let outputMime = 'image/png';
  let outputWidth: number | null = null;
  let outputHeight: number | null = null;

  if (payload.mode === 'client_data_url') {
    const parsedData = parseDataUrl(payload.dataUrl ?? '');
    if (!parsedData) {
      throw badRequestError('Invalid upscale image data URL.');
    }
    outputBuffer = parsedData.buffer;
    outputMime = parsedData.mime;
    const metadata = await sharp(outputBuffer).metadata().catch(() => null);
    outputWidth = metadata?.width ?? null;
    outputHeight = metadata?.height ?? null;
  } else {
    const sourceBuffer = await loadSourceBuffer(sourceSlot);
    const sourceMeta = await sharp(sourceBuffer).metadata();
    const sourceWidth = sourceMeta.width ?? sourceSlot.imageFile?.width ?? 0;
    const sourceHeight = sourceMeta.height ?? sourceSlot.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw badRequestError('Source image dimensions are invalid.');
    }

    outputWidth = Math.max(1, Math.round(sourceWidth * payload.scale));
    outputHeight = Math.max(1, Math.round(sourceHeight * payload.scale));
    outputBuffer = await sharp(sourceBuffer)
      .resize({
        width: outputWidth,
        height: outputHeight,
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();
    outputMime = 'image/png';
  }

  const ext = guessExtension(outputMime);
  const now = Date.now();
  const safeProjectId = sanitizeSegment(sourceSlot.projectId);
  const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
  const baseName =
    sanitizeFilename(payload.name ?? '') ||
    `upscale-${payload.mode}-${formatScaleLabel(payload.scale)}-${now}`;
  const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;
  const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
  const diskPath = path.join(diskDir, fileName);
  const publicPath = `/uploads/studio/upscale/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(diskPath, outputBuffer);

  const imageFileRepository = await getImageFileRepository();
  const imageFile = await imageFileRepository.createImageFile({
    filename: fileName,
    filepath: publicPath,
    mimetype: outputMime,
    size: outputBuffer.length,
    width: outputWidth,
    height: outputHeight,
  });

  const sourceLabel = sourceSlot.name?.trim() || sourceSlot.id;
  const scaleLabel = formatScaleLabel(payload.scale);
  const relationType = `upscale:output:${now}`;
  const metadata = {
    role: 'generation',
    sourceSlotId: sourceSlot.id,
    sourceSlotIds: [sourceSlot.id],
    relationType: 'upscale:output',
    upscale: {
      mode: payload.mode,
      scale: payload.scale,
      smoothingQuality: payload.mode === 'client_data_url' ? (payload.smoothingQuality ?? 'high') : undefined,
      kernel: payload.mode === 'server_sharp' ? 'lanczos3' : undefined,
      timestamp: new Date(now).toISOString(),
    },
  };

  const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
    {
      name: `${sourceLabel} • Upscale ${scaleLabel}`,
      folderPath: sourceSlot.folderPath ?? null,
      imageFileId: imageFile.id,
      imageUrl: imageFile.filepath,
      imageBase64: null,
      metadata,
    },
  ]);
  const createdSlot = createdSlots[0];
  if (!createdSlot) {
    throw badRequestError('Failed to create upscaled slot.');
  }

  await upsertImageStudioSlotLink({
    projectId: sourceSlot.projectId,
    sourceSlotId: sourceSlot.id,
    targetSlotId: createdSlot.id,
    relationType,
    metadata: {
      mode: payload.mode,
      scale: payload.scale,
    },
  });

  return NextResponse.json(
    {
      sourceSlotId: sourceSlot.id,
      mode: payload.mode,
      scale: payload.scale,
      slot: createdSlot,
      output: imageFile,
    },
    { status: 201 }
  );
}

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.slots.[slotId].upscale.POST' }
);
