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
  mode: z.enum(['client_alpha_bbox', 'server_alpha_bbox']).default('server_alpha_bbox'),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
});

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'center');
type SourceSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;

type ObjectBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

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
    throw badRequestError('Slot has no source image to center.');
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

function resolveAlphaObjectBounds(
  pixelData: Buffer,
  width: number,
  height: number
): ObjectBounds | null {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixelData[((y * width) + x) * 4 + 3];
      if (typeof alpha !== 'number' || alpha <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}

async function centerObjectByAlpha(sourceBuffer: Buffer): Promise<{
  outputBuffer: Buffer;
  width: number;
  height: number;
  sourceObjectBounds: ObjectBounds;
  targetObjectBounds: ObjectBounds;
}> {
  const sourceWithAlpha = sharp(sourceBuffer).ensureAlpha();
  const { data, info } = await sourceWithAlpha.raw().toBuffer({ resolveWithObject: true });
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw badRequestError('Source image dimensions are invalid.');
  }

  const sourceObjectBounds = resolveAlphaObjectBounds(data, width, height);
  if (!sourceObjectBounds) {
    throw badRequestError('No visible object pixels were detected to center.');
  }

  const targetLeft = Math.max(0, Math.round((width - sourceObjectBounds.width) / 2));
  const targetTop = Math.max(0, Math.round((height - sourceObjectBounds.height) / 2));
  const targetObjectBounds: ObjectBounds = {
    left: targetLeft,
    top: targetTop,
    width: sourceObjectBounds.width,
    height: sourceObjectBounds.height,
  };

  const extracted = await sharp(sourceBuffer)
    .ensureAlpha()
    .extract({
      left: sourceObjectBounds.left,
      top: sourceObjectBounds.top,
      width: sourceObjectBounds.width,
      height: sourceObjectBounds.height,
    })
    .png()
    .toBuffer();

  const outputBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: extracted, left: targetObjectBounds.left, top: targetObjectBounds.top }])
    .png()
    .toBuffer();

  return {
    outputBuffer,
    width,
    height,
    sourceObjectBounds,
    targetObjectBounds,
  };
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

  if (payload.mode === 'client_alpha_bbox' && !payload.dataUrl) {
    throw badRequestError('Client centering requires dataUrl.');
  }

  let outputBuffer: Buffer;
  let outputMime = 'image/png';
  let outputWidth: number | null = null;
  let outputHeight: number | null = null;
  let sourceObjectBounds: ObjectBounds | null = null;
  let targetObjectBounds: ObjectBounds | null = null;

  if (payload.mode === 'client_alpha_bbox') {
    const parsedData = parseDataUrl(payload.dataUrl ?? '');
    if (!parsedData) {
      throw badRequestError('Invalid centering image data URL.');
    }
    outputBuffer = parsedData.buffer;
    outputMime = parsedData.mime;
    const metadata = await sharp(outputBuffer).metadata().catch(() => null);
    outputWidth = metadata?.width ?? null;
    outputHeight = metadata?.height ?? null;
  } else {
    const sourceBuffer = await loadSourceBuffer(sourceSlot);
    const centered = await centerObjectByAlpha(sourceBuffer);
    outputBuffer = centered.outputBuffer;
    outputMime = 'image/png';
    outputWidth = centered.width;
    outputHeight = centered.height;
    sourceObjectBounds = centered.sourceObjectBounds;
    targetObjectBounds = centered.targetObjectBounds;
  }

  const ext = guessExtension(outputMime);
  const now = Date.now();
  const safeProjectId = sanitizeSegment(sourceSlot.projectId);
  const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
  const baseName =
    sanitizeFilename(payload.name ?? '') ||
    `center-${payload.mode}-${now}`;
  const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;
  const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
  const diskPath = path.join(diskDir, fileName);
  const publicPath = `/uploads/studio/center/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

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
  const relationType = `center:output:${now}`;
  const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
    {
      name: `${sourceLabel} • Centered`,
      folderPath: sourceSlot.folderPath ?? null,
      imageFileId: imageFile.id,
      imageUrl: imageFile.filepath,
      imageBase64: null,
      metadata: {
        role: 'generation',
        sourceSlotId: sourceSlot.id,
        sourceSlotIds: [sourceSlot.id],
        relationType: 'center:output',
        center: {
          mode: payload.mode,
          sourceObjectBounds,
          targetObjectBounds,
          timestamp: new Date(now).toISOString(),
        },
      },
    },
  ]);
  const createdSlot = createdSlots[0];
  if (!createdSlot) {
    throw badRequestError('Failed to create centered slot.');
  }

  await upsertImageStudioSlotLink({
    projectId: sourceSlot.projectId,
    sourceSlotId: sourceSlot.id,
    targetSlotId: createdSlot.id,
    relationType,
    metadata: {
      mode: payload.mode,
      sourceObjectBounds,
      targetObjectBounds,
    },
  });

  return NextResponse.json(
    {
      sourceSlotId: sourceSlot.id,
      mode: payload.mode,
      slot: createdSlot,
      output: imageFile,
      sourceObjectBounds,
      targetObjectBounds,
    },
    { status: 201 }
  );
}

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.slots.[slotId].center.POST' }
);
