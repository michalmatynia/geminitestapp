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
import { getImageFileRepository, getDiskPathFromPublicPath } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const cropRectSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

const payloadSchema = z.object({
  mode: z.enum(['client_bbox', 'server_bbox', 'server_polygon']),
  cropRect: cropRectSchema.optional(),
  polygon: z.array(pointSchema).min(3).optional(),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
});

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'crops');

type CropRect = z.infer<typeof cropRectSchema>;
type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;

const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_');

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
  if (mime.includes('jpeg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('avif')) return '.avif';
  return '.png';
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

async function loadSourceBuffer(slot: StudioSlotRecord): Promise<{ buffer: Buffer; mimeHint: string | null }> {
  const base64Candidate =
    typeof slot.imageBase64 === 'string' && slot.imageBase64.trim().startsWith('data:')
      ? slot.imageBase64.trim()
      : null;
  if (base64Candidate) {
    const parsed = parseDataUrl(base64Candidate);
    if (parsed) {
      return { buffer: parsed.buffer, mimeHint: parsed.mime };
    }
  }

  const sourcePath = slot.imageFile?.filepath ?? slot.imageUrl ?? null;
  if (!sourcePath) {
    throw badRequestError('Slot has no source image to crop.');
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
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeHint: contentType ? contentType.toLowerCase() : null,
    };
  }

  const diskPath = getDiskPathFromPublicPath(normalizedPath);
  const buffer = await fs.readFile(diskPath);
  return {
    buffer,
    mimeHint: slot.imageFile?.mimetype?.toLowerCase() ?? null,
  };
}

function clampCropRect(rect: CropRect, width: number, height: number): sharp.Region {
  const left = Math.floor(rect.x);
  const top = Math.floor(rect.y);
  const requestedWidth = Math.floor(rect.width);
  const requestedHeight = Math.floor(rect.height);

  const safeLeft = Math.max(0, Math.min(left, width - 1));
  const safeTop = Math.max(0, Math.min(top, height - 1));
  const safeWidth = Math.max(1, Math.min(requestedWidth, width - safeLeft));
  const safeHeight = Math.max(1, Math.min(requestedHeight, height - safeTop));

  return {
    left: safeLeft,
    top: safeTop,
    width: safeWidth,
    height: safeHeight,
  };
}

function polygonToPath(points: Array<{ x: number; y: number }>): string {
  return points
    .map((point) => `${Number(point.x.toFixed(2))},${Number(point.y.toFixed(2))}`)
    .join(' ');
}

async function cropByPolygonMask(
  sourceBuffer: Buffer,
  polygon: Array<{ x: number; y: number }>,
  width: number,
  height: number
): Promise<{ outputBuffer: Buffer; cropRect: CropRect }> {
  const pxPoints = polygon.map((point) => ({
    x: Math.max(0, Math.min(1, point.x)) * width,
    y: Math.max(0, Math.min(1, point.y)) * height,
  }));

  const xs = pxPoints.map((point) => point.x);
  const ys = pxPoints.map((point) => point.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.min(width, Math.ceil(Math.max(...xs)));
  const maxY = Math.min(height, Math.ceil(Math.max(...ys)));
  const regionWidth = Math.max(1, maxX - minX);
  const regionHeight = Math.max(1, maxY - minY);

  const extracted = await sharp(sourceBuffer)
    .extract({
      left: minX,
      top: minY,
      width: regionWidth,
      height: regionHeight,
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const relativePoints = pxPoints.map((point) => ({
    x: point.x - minX,
    y: point.y - minY,
  }));

  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${regionWidth}" height="${regionHeight}" viewBox="0 0 ${regionWidth} ${regionHeight}"><polygon points="${polygonToPath(
      relativePoints
    )}" fill="white" /></svg>`,
    'utf8'
  );

  const outputBuffer = await sharp(extracted)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return {
    outputBuffer,
    cropRect: {
      x: minX,
      y: minY,
      width: regionWidth,
      height: regionHeight,
    },
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

  if (payload.mode === 'client_bbox') {
    if (!payload.dataUrl) {
      throw badRequestError('Client crop requires dataUrl.');
    }
  } else if (payload.mode === 'server_bbox') {
    if (!payload.cropRect) {
      throw badRequestError('Server bbox crop requires cropRect.');
    }
  } else if (!payload.polygon || payload.polygon.length < 3) {
    throw badRequestError('Polygon crop requires at least 3 points.');
  }

  let outputBuffer: Buffer;
  let outputMime = 'image/png';
  let cropRect: CropRect | null = payload.cropRect ?? null;

  if (payload.mode === 'client_bbox') {
    const parsedData = parseDataUrl(payload.dataUrl ?? '');
    if (!parsedData) {
      throw badRequestError('Invalid crop image data URL.');
    }
    outputBuffer = parsedData.buffer;
    outputMime = parsedData.mime;
  } else {
    const source = await loadSourceBuffer(sourceSlot);
    const metadata = await sharp(source.buffer).metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw badRequestError('Source image dimensions are invalid.');
    }

    if (payload.mode === 'server_bbox') {
      const region = clampCropRect(payload.cropRect!, sourceWidth, sourceHeight);
      outputBuffer = await sharp(source.buffer).extract(region).png().toBuffer();
      cropRect = {
        x: region.left,
        y: region.top,
        width: region.width,
        height: region.height,
      };
      outputMime = 'image/png';
    } else {
      const polygonResult = await cropByPolygonMask(
        source.buffer,
        payload.polygon!,
        sourceWidth,
        sourceHeight
      );
      outputBuffer = polygonResult.outputBuffer;
      cropRect = polygonResult.cropRect;
      outputMime = 'image/png';
    }
  }

  const ext = guessExtension(outputMime);
  const now = Date.now();
  const safeProjectId = sanitizeSegment(sourceSlot.projectId);
  const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
  const baseName =
    sanitizeFilename(payload.name ?? '') ||
    `crop-${payload.mode}-${now}`;
  const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

  const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
  const diskPath = path.join(diskDir, fileName);
  const publicPath = `/uploads/studio/crops/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(diskPath, outputBuffer);

  const imageFileRepository = await getImageFileRepository();
  const imageFile = await imageFileRepository.createImageFile({
    filename: fileName,
    filepath: publicPath,
    mimetype: outputMime,
    size: outputBuffer.length,
  });

  const sourceLabel = sourceSlot.name?.trim() || sourceSlot.id;
  const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
    {
      name: `${sourceLabel} • Crop`,
      folderPath: sourceSlot.folderPath ?? null,
      imageFileId: imageFile.id,
      imageUrl: imageFile.filepath,
      imageBase64: null,
      metadata: {
        role: 'generation',
        sourceSlotId: sourceSlot.id,
        sourceSlotIds: [sourceSlot.id],
        relationType: 'crop:output',
        crop: {
          mode: payload.mode,
          cropRect,
          polygon: payload.mode === 'server_polygon' ? payload.polygon : undefined,
          timestamp: new Date(now).toISOString(),
        },
      },
    },
  ]);

  const createdSlot = createdSlots[0];
  if (!createdSlot) {
    throw badRequestError('Failed to create cropped slot.');
  }

  await upsertImageStudioSlotLink({
    projectId: sourceSlot.projectId,
    sourceSlotId: sourceSlot.id,
    targetSlotId: createdSlot.id,
    relationType: `crop:output:${now}`,
    metadata: {
      mode: payload.mode,
      cropRect,
    },
  });

  return NextResponse.json(
    {
      slot: createdSlot,
      imageFile,
      mode: payload.mode,
      cropRect,
    },
    { status: 201 }
  );
}

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.slots.[slotId].crop.POST' }
);
