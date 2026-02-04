export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import prisma from "@/shared/lib/db/prisma";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

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

const slotSchema = z.object({
  name: z.string().trim().min(1).optional(),
  folderPath: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  imageBase64: z.string().trim().optional(),
  imageFileId: z.string().trim().optional(),
  asset3dId: z.string().trim().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createSchema = z.object({
  count: z.number().int().min(1).max(100).optional(),
  slots: z.array(slotSchema).optional(),
});

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    let slots: unknown[] = [];
    try {
      slots = await prisma.imageStudioSlot.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          imageFile: true,
          screenshotFile: true,
          asset3d: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const code = error.code;
        if (code === "P2021" || code === "P2022") {
          return NextResponse.json(
            {
              slots: [],
              warning: "Image studio slots store is not available yet.",
              code,
            },
            { status: 200 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ slots });
  } catch (error) {
    return createErrorResponse(error, {
      request: _req,
      source: "image-studio.projects.[projectId].slots.GET",
      fallbackMessage: "Failed to load slots",
      extra: { projectId: params.projectId },
    });
  }
}

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let existingCount = 0;
    try {
      existingCount = await prisma.imageStudioSlot.count({ where: { projectId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const code = error.code;
        if (code === "P2021" || code === "P2022") {
          return NextResponse.json(
            {
              error: "Image studio slots store is not available yet.",
              code,
            },
            { status: 503 }
          );
        }
      }
      throw error;
    }
    const incomingSlots = parsed.data.slots ?? [];
    const count = parsed.data.count ?? incomingSlots.length;
    const maxCreate = Math.max(0, Math.min(100 - existingCount, count));
    if (maxCreate <= 0) {
      return NextResponse.json({ error: "Slot limit reached" }, { status: 400 });
    }

    const baseName = Date.now().toString();
    type SlotInput = {
      name?: string;
      folderPath?: string;
      imageUrl?: string;
      imageBase64?: string;
      imageFileId?: string;
      asset3dId?: string;
      metadata?: Record<string, unknown>;
    };

    const slotsToCreate = (incomingSlots.length > 0 ? (incomingSlots as SlotInput[]) : new Array<SlotInput>(maxCreate).fill({}))
      .slice(0, maxCreate)
      .map((slot: SlotInput, index: number) => ({
        projectId,
        name: slot.name?.trim() || `Slot ${baseName}-${index + 1}`,
        folderPath: slot.folderPath ? sanitizeFolderPath(slot.folderPath) : "",
        imageUrl: slot.imageUrl?.trim() || null,
        imageBase64: slot.imageBase64?.trim() || null,
        imageFileId: slot.imageFileId?.trim() || null,
        asset3dId: slot.asset3dId?.trim() || null,
        metadata: (slot.metadata as Prisma.JsonValue) ?? null,
      }));

    let created: Prisma.ImageStudioSlotCreateInput[] | unknown[] = [];
    try {
      created = await prisma.$transaction(
        slotsToCreate.map((slot) =>
          prisma.imageStudioSlot.create({
            data: slot as Prisma.ImageStudioSlotCreateInput,
            include: {
              imageFile: true,
              screenshotFile: true,
              asset3d: true,
            },
          })
        )
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const code = error.code;
        if (code === "P2021" || code === "P2022") {
          return NextResponse.json(
            {
              error: "Image studio slots store is not available yet.",
              code,
            },
            { status: 503 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ slots: created }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].slots.POST",
      fallbackMessage: "Failed to create slots",
      extra: { projectId: params.projectId },
    });
  }
}

export const GET = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    GET_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].slots.GET", rateLimitKey: "search" }
);

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].slots.POST" }
);
