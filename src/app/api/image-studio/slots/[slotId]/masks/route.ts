export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import { upsertImageStudioSlotLink } from '@/features/ai/image-studio/server/slot-link-repository';
import { getImageFileRepository } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  masks: z
    .array(
      z.object({
        variant: z.enum(['white', 'black']),
        inverted: z.boolean().optional(),
        dataUrl: z.string().trim().min(1),
        filename: z.string().trim().optional(),
      })
    )
    .min(1)
    .max(8),
});

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'masks');

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = match[1] ?? 'image/png';
    return { buffer, mime };
  } catch {
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
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
}

function buildMaskFolderPath(sourceFolder: string | null | undefined, sourceSlotId: string): string {
  const prefix = sourceFolder ? sanitizeFolderPath(sourceFolder) : '';
  const suffix = `_masks/${sourceSlotId}`;
  return prefix ? `${prefix}/${suffix}` : suffix;
}

async function POST_handler(
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

  const maskFolderPath = buildMaskFolderPath(sourceSlot.folderPath, sourceSlot.id);
  const diskDir = path.join(uploadsRoot, sourceSlot.id);
  await fs.mkdir(diskDir, { recursive: true });

  const imageFileRepository = await getImageFileRepository();
  const results: Array<Record<string, unknown>> = [];

  for (const mask of parsed.data.masks) {
    const parsedData = parseDataUrl(mask.dataUrl);
    if (!parsedData) {
      throw badRequestError('Invalid mask data URL');
    }

    const ext = guessExtension(parsedData.mime);
    const provided = mask.filename?.trim();
    const defaultName = `mask-${mask.variant}${mask.inverted ? '-inverted' : ''}-${Date.now()}${ext}`;
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
    const createdMaskSlots = await createImageStudioSlots(sourceSlot.projectId, [
      {
        name: `${sourceSlot.name || sourceSlot.id} • ${mask.variant}${mask.inverted ? ' inverted' : ''} mask`,
        folderPath: maskFolderPath,
        imageFileId: imageFile.id,
        imageUrl: imageFile.filepath,
        imageBase64: null,
        metadata: {
          role: 'mask',
          sourceSlotId: sourceSlot.id,
          variant: mask.variant,
          inverted: Boolean(mask.inverted),
          relationType,
        },
      },
    ]);
    const maskSlot = createdMaskSlots[0];
    if (!maskSlot) {
      throw badRequestError('Failed to create mask slot');
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

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.slots.[slotId].masks.POST' }
);
