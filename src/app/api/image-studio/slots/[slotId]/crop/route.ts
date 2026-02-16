export const runtime = 'nodejs';

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
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
type CropPayload = z.infer<typeof payloadSchema>;
type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;
type UploadedClientCropImage = {
  buffer: Buffer;
  mime: string;
};
type CropPoint = { x: number; y: number };

const isFileLike = (value: FormDataEntryValue | null): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const parseJsonFormValue = <T>(value: FormDataEntryValue | null): T | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return undefined;
  }
};

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

async function parseCropRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientCropImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const jsonBody = (await req.json().catch(() => null)) as unknown;
    return { body: jsonBody, uploadedClientImage: null };
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return { body: null, uploadedClientImage: null };
  }

  const mode = form.get('mode');
  const cropRect = parseJsonFormValue<CropRect>(form.get('cropRect'));
  const polygon = parseJsonFormValue<Array<{ x: number; y: number }>>(form.get('polygon'));
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const image = form.get('image');

  let uploadedClientImage: UploadedClientCropImage | null = null;
  if (isFileLike(image) && image.size > 0) {
    const arrayBuffer = await image.arrayBuffer();
    uploadedClientImage = {
      buffer: Buffer.from(arrayBuffer),
      mime: image.type?.trim().toLowerCase() || 'image/png',
    };
  }

  return {
    body: {
      ...(typeof mode === 'string' ? { mode } : {}),
      ...(cropRect ? { cropRect } : {}),
      ...(polygon ? { polygon } : {}),
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
    },
    uploadedClientImage,
  };
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

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeCropRectForFingerprint = (rect: CropRect | undefined): CropRect | null => {
  if (!rect) return null;
  return {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
};

const normalizePolygonForFingerprint = (
  polygon: Array<CropPoint> | undefined
): Array<CropPoint> | null => {
  if (!polygon || polygon.length === 0) return null;
  return polygon.map((point) => ({
    x: Number(clampUnit(point.x).toFixed(5)),
    y: Number(clampUnit(point.y).toFixed(5)),
  }));
};

const buildCropDedupeRelationType = (
  sourceSlot: StudioSlotRecord,
  payload: CropPayload,
  now: number
): string => {
  const sourceSignature = [
    sourceSlot.id,
    sourceSlot.projectId,
    sourceSlot.imageFileId ?? '',
    sourceSlot.imageFile?.filepath ?? sourceSlot.imageUrl ?? '',
    sourceSlot.imageBase64 ? `b64:${sourceSlot.imageBase64.length}` : '',
  ].join('|');
  const fingerprintPayload = {
    sourceSignature,
    mode: payload.mode,
    cropRect: normalizeCropRectForFingerprint(payload.cropRect),
    polygon: normalizePolygonForFingerprint(payload.polygon),
  };
  const fingerprint = createHash('sha1')
    .update(JSON.stringify(fingerprintPayload))
    .digest('hex')
    .slice(0, 16);
  const dedupeBucket = Math.floor(now / 4000);
  return `crop:output:${fingerprint}:${dedupeBucket}`;
};

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

  const { body, uploadedClientImage } = await parseCropRequestPayload(req);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) throw notFoundError('Source slot not found.');

  const payload = parsed.data;
  const now = Date.now();
  const dedupeRelationType = buildCropDedupeRelationType(sourceSlot, payload, now);
  const existingLink = await getImageStudioSlotLinkBySourceAndRelation(
    sourceSlot.projectId,
    sourceSlot.id,
    dedupeRelationType
  );
  if (existingLink) {
    const existingSlot = await getImageStudioSlotById(existingLink.targetSlotId);
    if (existingSlot) {
      return NextResponse.json(
        {
          slot: existingSlot,
          mode: payload.mode,
          cropRect: payload.cropRect ?? null,
          deduplicated: true,
        },
        { status: 200 }
      );
    }
  }

  if (payload.mode === 'client_bbox') {
    if (!payload.dataUrl && !uploadedClientImage) {
      throw badRequestError('Client crop requires an uploaded image or dataUrl.');
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
    if (uploadedClientImage) {
      outputBuffer = uploadedClientImage.buffer;
      outputMime = uploadedClientImage.mime;
    } else {
      const parsedData = parseDataUrl(payload.dataUrl ?? '');
      if (!parsedData) {
        throw badRequestError('Invalid crop image data URL.');
      }
      outputBuffer = parsedData.buffer;
      outputMime = parsedData.mime;
    }
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
    relationType: dedupeRelationType,
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
