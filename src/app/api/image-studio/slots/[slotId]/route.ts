export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { deleteImageStudioSlot, updateImageStudioSlot } from "@/features/ai/image-studio/server/slot-repository";

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9-_]/g, "_"))
    .filter(Boolean);
  return parts.join("/");
};

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  folderPath: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().nullable(),
  imageBase64: z.string().trim().optional().nullable(),
  imageFileId: z.string().trim().optional().nullable(),
  asset3dId: z.string().trim().optional().nullable(),
  screenshotFileId: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? "";
  if (!slotId) throw badRequestError("Slot id is required");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError("Invalid payload", { errors: parsed.error.format() });
  }

  const data = {
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    ...(parsed.data.folderPath !== undefined ? { folderPath: sanitizeFolderPath(parsed.data.folderPath ?? "") } : {}),
    ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
    ...(parsed.data.imageBase64 !== undefined ? { imageBase64: parsed.data.imageBase64 ?? null } : {}),
    ...(parsed.data.imageFileId !== undefined ? { imageFileId: parsed.data.imageFileId ?? null } : {}),
    ...(parsed.data.asset3dId !== undefined ? { asset3dId: parsed.data.asset3dId ?? null } : {}),
    ...(parsed.data.screenshotFileId !== undefined ? { screenshotFileId: parsed.data.screenshotFileId ?? null } : {}),
    ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata ?? null } : {}),
  };

  const updated = await updateImageStudioSlot(slotId, data);
  if (!updated) throw notFoundError("Slot not found");

  return NextResponse.json({ slot: updated });
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? "";
  if (!slotId) throw badRequestError("Slot id is required");

  const deleted = await deleteImageStudioSlot(slotId);
  if (!deleted) throw notFoundError("Slot not found");
  return NextResponse.json({ ok: true });
}

export const PATCH = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    PATCH_handler(req, ctx, params),
  { source: "image-studio.slots.[slotId].PATCH" }
);

export const DELETE = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    DELETE_handler(req, ctx, params),
  { source: "image-studio.slots.[slotId].DELETE" }
);
