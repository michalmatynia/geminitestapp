import fs from 'fs/promises';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImageStudioSlotById, updateImageStudioSlot } from '@/features/ai/server';
import { getImageFileRepository } from '@/features/files/server';
import { imageStudioSlotScreenshotResponseSchema } from '@/shared/contracts/image-studio/slot';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { studioRoot } from '@/shared/lib/files/server-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const payloadSchema = z.object({
  dataUrl: z.string().trim().min(1),
  filename: z.string().trim().optional(),
});

const uploadsRoot = path.join(studioRoot, 'screenshots');

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = match[1] ?? 'image/png';
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

export async function postHandler(
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

  const slot = await getImageStudioSlotById(slotId);
  if (!slot) throw notFoundError('Slot not found');

  const parsedData = parseDataUrl(parsed.data.dataUrl);
  if (!parsedData) {
    throw badRequestError('Invalid data URL');
  }

  const ext = guessExtension(parsedData.mime);
  const filename = parsed.data.filename?.trim() || `screenshot-${Date.now()}${ext}`;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const diskDir = path.join(uploadsRoot, slotId);
  const diskPath = path.join(diskDir, safeName);
  const publicPath = `/uploads/studio/screenshots/${slotId}/${safeName}`;

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(diskPath, parsedData.buffer);

  const repo = await getImageFileRepository();
  const imageFile = await repo.createImageFile({
    filename: safeName,
    filepath: publicPath,
    mimetype: parsedData.mime,
    size: parsedData.buffer.length,
  });

  const updated = await updateImageStudioSlot(slotId, {
    screenshotFileId: imageFile.id,
    ...(slot.asset3dId && !slot.imageBase64 ? { imageBase64: parsed.data.dataUrl } : {}),
  });
  if (!updated) throw notFoundError('Slot not found');

  return NextResponse.json(
    imageStudioSlotScreenshotResponseSchema.parse({ slot: updated, screenshot: imageFile })
  );
}
