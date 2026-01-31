import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDiskPathFromPublicPath, getImageFileRepository } from "@/features/files/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";

const tagsSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
});

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;

  try {
    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.getImageFileById(id);

    if (!imageFile) {
      throw notFoundError("File not found");
    }

    // Physical file deletion
    if (imageFile) {
      try {
        await fs.unlink(getDiskPathFromPublicPath(imageFile.filepath));
      } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }

    await imageFileRepository.deleteImageFile(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "files.[id].DELETE",
      fallbackMessage: "Failed to delete file",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "files.[id].DELETE" });

async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  try {
    const parsed = await parseJsonBody(req, tagsSchema, {
      logPrefix: "files-tags",
    });
    if (!parsed.ok) return parsed.response;

    const imageFileRepository = await getImageFileRepository();
    const updated = await imageFileRepository.updateImageFileTags(id, parsed.data.tags);
    if (!updated) {
      throw notFoundError("File not found");
    }
    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "files.[id].PATCH",
      fallbackMessage: "Failed to update file tags",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: "files.[id].PATCH" });
