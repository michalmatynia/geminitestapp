export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/shared/lib/db/prisma";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";

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
  try {
    const slotId = params.slotId?.trim() ?? "";
    if (!slotId) throw badRequestError("Slot id is required");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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

    const updated = await prisma.imageStudioSlot.update({
      where: { id: slotId },
      data,
      include: {
        imageFile: true,
        screenshotFile: true,
        asset3d: true,
      },
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return createErrorResponse(notFoundError("Slot not found"), {
        request: req,
        source: "image-studio.slots.[slotId].PATCH",
        fallbackMessage: "Slot not found",
      });
    }
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.slots.[slotId].PATCH",
      fallbackMessage: "Failed to update slot",
      extra: { slotId: params.slotId },
    });
  }
}

async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  try {
    const slotId = params.slotId?.trim() ?? "";
    if (!slotId) throw badRequestError("Slot id is required");

    const existing = await prisma.imageStudioSlot.findUnique({ where: { id: slotId } });
    if (!existing) throw notFoundError("Slot not found");

    await prisma.imageStudioSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.slots.[slotId].DELETE",
      fallbackMessage: "Failed to delete slot",
      extra: { slotId: params.slotId },
    });
  }
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
