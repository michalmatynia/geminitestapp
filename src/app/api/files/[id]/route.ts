import fs from "fs/promises";
import { NextRequest } from "next/server";

import { getDiskPathFromPublicPath } from "@/features/files/utils/fileUploader";
import { getImageFileRepository } from "@/features/files/services/image-file-repository";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

async function DELETE_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "files.[id].DELETE" });
