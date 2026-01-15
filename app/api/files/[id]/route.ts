import fs from "fs/promises";
import { NextResponse } from "next/server";

import { getDiskPathFromPublicPath } from "@/lib/utils/fileUploader";
import { getImageFileRepository } from "@/lib/services/image-file-repository";

export async function DELETE(req: Request, { params }: any) {
  const { id } = params;

  try {
    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.getImageFileById(id);

    if (!imageFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
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
    console.error(`Error deleting file ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
