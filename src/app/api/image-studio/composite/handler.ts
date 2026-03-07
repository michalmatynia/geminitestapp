import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import { getImageStudioSlotById } from '@/features/ai/image-studio/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

// ── Validation ──────────────────────────────────────────────────────────────

const layerSchema = z.object({
  slotId: z.string().min(1),
  order: z.number().int().min(0),
  opacity: z.number().min(0).max(1).optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional(),
});

const payloadSchema = z.object({
  layers: z.array(layerSchema).min(2),
  flatten: z.boolean().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const BLEND_MAP: Record<string, sharp.Blend> = {
  normal: 'over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
};

async function resolveSlotImage(slotId: string): Promise<Buffer | null> {
  const slot = await getImageStudioSlotById(slotId);
  if (!slot) return null;

  // Try base64 data URL first
  if (slot.imageBase64) {
    const match = slot.imageBase64.match(/^data:[^;]+;base64,(.+)$/);
    if (match?.[1]) {
      return Buffer.from(match[1], 'base64');
    }
  }

  // Try image file path
  if (slot.imageFile?.filepath) {
    try {
      const res = await fetch(slot.imageFile.filepath);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // fall through
    }
  }

  // Try image URL
  if (slot.imageUrl) {
    try {
      const res = await fetch(slot.imageUrl);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // fall through
    }
  }

  return null;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const { layers } = parsed.data;

  // Sort layers by order
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

  // Load all layer images
  const layerImages: { buffer: Buffer; opacity: number; blend: sharp.Blend }[] = [];
  for (const layer of sortedLayers) {
    const buffer = await resolveSlotImage(layer.slotId);
    if (!buffer) {
      throw badRequestError(`Could not load image for slot ${layer.slotId}`);
    }
    layerImages.push({
      buffer,
      opacity: layer.opacity ?? 1,
      blend: BLEND_MAP[layer.blendMode ?? 'normal'] ?? 'over',
    });
  }

  if (layerImages.length < 2) {
    throw badRequestError('At least 2 valid layer images are required');
  }

  // Use the first layer as the base; get its dimensions
  const baseImage = sharp(layerImages[0]!.buffer);
  const baseMeta = await baseImage.metadata();
  const width = baseMeta.width ?? 512;
  const height = baseMeta.height ?? 512;

  // Resize base to ensure consistent dimensions and get raw buffer
  const baseBuffer = await baseImage.resize(width, height, { fit: 'cover' }).png().toBuffer();

  // Build composite inputs for subsequent layers
  const compositeInputs: sharp.OverlayOptions[] = [];
  for (let i = 1; i < layerImages.length; i++) {
    const layer = layerImages[i]!;
    // Resize layer to match base dimensions
    let layerBuffer = await sharp(layer.buffer)
      .resize(width, height, { fit: 'cover' })
      .png()
      .toBuffer();

    // Apply opacity if not 1
    if (layer.opacity < 1) {
      layerBuffer = await sharp(layerBuffer).ensureAlpha(layer.opacity).toBuffer();
    }

    compositeInputs.push({
      input: layerBuffer,
      blend: layer.blend,
      top: 0,
      left: 0,
    });
  }

  // Composite all layers
  const resultBuffer = await sharp(baseBuffer).composite(compositeInputs).png().toBuffer();

  const resultImageBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

  return NextResponse.json({ resultImageBase64 });
}
