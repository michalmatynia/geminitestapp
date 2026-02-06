export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { getImageFileRepository } from "@/features/files/server";
import { getImageStudioSlotById, updateImageStudioSlot } from "@/features/ai/image-studio/server/slot-repository";

const payloadSchema = z.object({
  dataUrl: z.string().trim().min(1),
  filename: z.string().trim().optional(),
});

const uploadsRoot = path.join(process.cwd(), "public", "uploads", "studio", "screenshots");

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? "", "base64");
    const mime = match[1] ?? "image/png";
    return { buffer, mime };
  } catch {
    return null;
  }
}

function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes("jpeg")) return ".jpg";
  if (clean.includes("png")) return ".png";
  if (clean.includes("webp")) return ".webp";
  return ".png";
}

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  try {
    const slotId = params.slotId?.trim() ?? "";
    if (!slotId) throw badRequestError("Slot id is required");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequestError("Invalid payload", { errors: parsed.error.format() });
    }

    const slot = await getImageStudioSlotById(slotId);
    if (!slot) throw notFoundError("Slot not found");

    const parsedData = parseDataUrl(parsed.data.dataUrl);
    if (!parsedData) {
      throw badRequestError("Invalid data URL");
    }

    const ext = guessExtension(parsedData.mime);
    const filename = parsed.data.filename?.trim() || `screenshot-${Date.now()}${ext}`;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
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
    if (!updated) throw notFoundError("Slot not found");

    return NextResponse.json({ slot: updated, screenshot: imageFile });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.slots.[slotId].screenshot.POST",
      fallbackMessage: "Failed to save screenshot",
      extra: { slotId: params.slotId },
    });
  }
}

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.slots.[slotId].screenshot.POST" }
);
