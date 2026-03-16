import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/server';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  updateImageStudioSlot,
} from '@/features/ai/server';
import { getDiskPathFromPublicPath, getImageFileRepository } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { studioRoot } from '@/shared/lib/files/server-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const maskEntrySchema = z.object({
  variant: z.enum(['white', 'black']),
  inverted: z.boolean().optional(),
  dataUrl: z.string().trim().min(1).optional(),
  polygons: z.array(z.array(pointSchema).min(3)).min(1).optional(),
  filename: z.string().trim().optional(),
});

const payloadSchema = z.object({
  mode: z.enum(['client_data_url', 'server_polygon']).optional(),
  masks: z.array(maskEntrySchema).min(1).max(8),
});

const uploadsRoot = path.join(studioRoot, 'masks');
type SourceSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
}

function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('png')) return '.png';
  if (clean.includes('webp')) return '.webp';
  return '.png';
}

function sanitizeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe || `mask-${Date.now()}.png`;
}

function sanitizeFolderPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
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

function buildMaskFolderPath(
  sourceFolder: string | null | undefined,
  sourceSlotId: string
): string {
  const prefix = sourceFolder ? sanitizeFolderPath(sourceFolder) : '';
  const suffix = `_masks/${sourceSlotId}`;
  return prefix ? `${prefix}/${suffix}` : suffix;
}

async function loadSourceBuffer(sourceSlot: SourceSlotRecord): Promise<Buffer> {
  const base64Candidate =
    typeof sourceSlot.imageBase64 === 'string' && sourceSlot.imageBase64.trim().startsWith('data:')
      ? sourceSlot.imageBase64.trim()
      : null;

  if (base64Candidate) {
    const parsedData = parseDataUrl(base64Candidate);
    if (parsedData) return parsedData.buffer;
  }

  const sourcePath = sourceSlot.imageFile?.filepath ?? sourceSlot.imageUrl ?? null;
  if (!sourcePath) {
    throw badRequestError('Source slot has no image path.');
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw badRequestError('Source image path is invalid.');
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

const colorFor = (
  hex: '#000000' | '#ffffff'
): { r: number; g: number; b: number; alpha: number } =>
  hex === '#000000' ? { r: 0, g: 0, b: 0, alpha: 1 } : { r: 255, g: 255, b: 255, alpha: 1 };

const resolveMaskColors = (
  variant: 'white' | 'black',
  inverted: boolean
): { background: '#000000' | '#ffffff'; fill: '#000000' | '#ffffff' } => {
  const preferWhite = variant === 'white';
  const background =
    (preferWhite && !inverted) || (!preferWhite && inverted) ? '#000000' : '#ffffff';
  const fill = background === '#000000' ? '#ffffff' : '#000000';
  return { background, fill };
};

const polygonPointsToSvg = (
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number
): string =>
  points
    .map((point) => {
      const x = Math.max(0, Math.min(1, point.x)) * width;
      const y = Math.max(0, Math.min(1, point.y)) * height;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');

async function buildServerPolygonMaskBuffer({
  sourceBuffer,
  width,
  height,
  variant,
  inverted,
  polygons,
}: {
  sourceBuffer: Buffer;
  width: number;
  height: number;
  variant: 'white' | 'black';
  inverted: boolean;
  polygons: Array<Array<{ x: number; y: number }>>;
}): Promise<Buffer> {
  const { background, fill } = resolveMaskColors(variant, inverted);
  const polygonMaskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="black" />${polygons
      .map(
        (polygon) =>
          `<polygon points="${polygonPointsToSvg(polygon, width, height)}" fill="white" />`
      )
      .join('')}</svg>`,
    'utf8'
  );

  // Apply polygon mask to the high-res source first for reproducible alpha extraction.
  const cutout = await sharp(sourceBuffer)
    .ensureAlpha()
    .composite([{ input: polygonMaskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const alphaMask = await sharp(cutout)
    .ensureAlpha()
    .extractChannel(3)
    .toColourspace('b-w')
    .png()
    .toBuffer();

  const fillLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: colorFor(fill),
    },
  })
    .composite([{ input: alphaMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: colorFor(background),
    },
  })
    .composite([{ input: fillLayer, blend: 'over' }])
    .png()
    .toBuffer();
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) throw badRequestError('Slot id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) throw notFoundError('Source slot not found');
  const mode = parsed.data.mode ?? 'client_data_url';

  if (mode === 'client_data_url') {
    const missingDataUrls = parsed.data.masks.some((mask) => !mask.dataUrl);
    if (missingDataUrls) {
      throw badRequestError('Client mask mode requires dataUrl in all masks.');
    }
  } else {
    const missingPolygons = parsed.data.masks.some(
      (mask) => !mask.polygons || mask.polygons.length === 0
    );
    if (missingPolygons) {
      throw badRequestError('Server polygon mode requires polygons in all masks.');
    }
  }

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = sourceSlot.imageFile?.width ?? null;
  let sourceHeight = sourceSlot.imageFile?.height ?? null;
  if (mode === 'server_polygon') {
    sourceBuffer = await loadSourceBuffer(sourceSlot);
    const metadata = await sharp(sourceBuffer).metadata();
    sourceWidth = metadata.width ?? sourceWidth;
    sourceHeight = metadata.height ?? sourceHeight;
  }
  if (mode === 'server_polygon' && (!(sourceWidth && sourceHeight) || !sourceBuffer)) {
    throw badRequestError('Could not resolve source image dimensions for server polygon mask.');
  }

  const maskFolderPath = buildMaskFolderPath(sourceSlot.folderPath, sourceSlot.id);
  const diskDir = path.join(uploadsRoot, sourceSlot.id);
  await fs.mkdir(diskDir, { recursive: true });

  const imageFileRepository = await getImageFileRepository();
  const results: Array<Record<string, unknown>> = [];

  for (const mask of parsed.data.masks) {
    let parsedData: { buffer: Buffer; mime: string };
    if (mode === 'client_data_url') {
      const result = parseDataUrl(mask.dataUrl ?? '');
      if (!result) {
        throw badRequestError('Invalid mask data URL');
      }
      parsedData = result;
    } else {
      const polygons = mask.polygons ?? [];
      if (!(sourceWidth && sourceHeight) || !sourceBuffer) {
        throw badRequestError('Missing source dimensions for server polygon mask.');
      }
      const buffer = await buildServerPolygonMaskBuffer({
        sourceBuffer,
        width: sourceWidth,
        height: sourceHeight,
        variant: mask.variant,
        inverted: Boolean(mask.inverted),
        polygons,
      });
      parsedData = { buffer, mime: 'image/png' };
    }

    const ext = guessExtension(parsedData.mime);
    const provided = mask.filename?.trim();
    const defaultName = `mask-${mode}-${mask.variant}${mask.inverted ? '-inverted' : ''}-${Date.now()}${ext}`;
    const safeName = sanitizeFileName(provided || defaultName);
    const diskPath = path.join(diskDir, safeName);
    const publicPath = `/uploads/studio/masks/${sourceSlot.id}/${safeName}`;

    await fs.writeFile(diskPath, parsedData.buffer);

    const imageFile = await imageFileRepository.createImageFile({
      filename: safeName,
      filepath: publicPath,
      mimetype: parsedData.mime,
      size: parsedData.buffer.length,
    });

    const relationType = `mask:${mask.variant}${mask.inverted ? ':inverted' : ''}`;
    const metadata = {
      role: 'mask',
      sourceSlotId: sourceSlot.id,
      variant: mask.variant,
      inverted: Boolean(mask.inverted),
      relationType,
      generationMode: mode,
      polygonCount: mode === 'server_polygon' ? (mask.polygons?.length ?? 0) : undefined,
    };
    let maskSlot = null;

    const existingLink = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      relationType
    );

    if (existingLink?.targetSlotId) {
      const existingSlot = await getImageStudioSlotById(existingLink.targetSlotId);
      if (existingSlot) {
        maskSlot = await updateImageStudioSlot(existingSlot.id, {
          name: `${sourceSlot.name || sourceSlot.id} • ${mask.variant}${mask.inverted ? ' inverted' : ''} mask`,
          folderPath: maskFolderPath,
          imageFileId: imageFile.id,
          imageUrl: imageFile.filepath,
          imageBase64: null,
          metadata,
        });
      }
    }

    if (!maskSlot) {
      const createdMaskSlots = await createImageStudioSlots(sourceSlot.projectId, [
        {
          name: `${sourceSlot.name || sourceSlot.id} • ${mask.variant}${mask.inverted ? ' inverted' : ''} mask`,
          folderPath: maskFolderPath,
          imageFileId: imageFile.id,
          imageUrl: imageFile.filepath,
          imageBase64: null,
          metadata,
        },
      ]);
      maskSlot = createdMaskSlots[0] ?? null;
    }

    if (!maskSlot) {
      throw badRequestError('Failed to create or update mask slot');
    }

    const link = await upsertImageStudioSlotLink({
      projectId: sourceSlot.projectId,
      sourceSlotId: sourceSlot.id,
      targetSlotId: maskSlot.id,
      relationType,
      metadata: {
        sourceType: 'image-mask',
        variant: mask.variant,
        inverted: Boolean(mask.inverted),
      },
    });

    results.push({
      variant: mask.variant,
      inverted: Boolean(mask.inverted),
      relationType,
      slot: maskSlot,
      link,
      imageFile,
    });
  }

  return NextResponse.json({ sourceSlotId: sourceSlot.id, masks: results }, { status: 201 });
}
