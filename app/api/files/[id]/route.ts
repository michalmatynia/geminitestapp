import fs from "fs/promises";
import { NextRequest } from "next/server";

import { getDiskPathFromPublicPath } from "@/lib/utils/fileUploader";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";

export async function DELETE(
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
      source: "files/[id].DELETE",
      fallbackMessage: "Failed to delete file",
    });
  }
}
