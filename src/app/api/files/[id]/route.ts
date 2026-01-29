import fs from "fs/promises";
import { NextRequest } from "next/server";

import { getDiskPathFromPublicPath, getImageFileRepository } from "@/features/files/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

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
