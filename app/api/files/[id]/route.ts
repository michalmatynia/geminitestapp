import fs from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  const { id } = params as { id: string };

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    const filepath = path.join(process.cwd(), "public", imageFile.filepath);

    try {
      await fs.unlink(filepath);
    } catch (_error: unknown) {
      const error = _error as { code?: string };
      if (error.code !== "ENOENT") {
        console.error("Error deleting file from filesystem:", error);
        // We can choose to continue even if file deletion fails,
        // as the primary goal is to remove the DB record.
      }
    }

    await prisma.productImage.deleteMany({
      where: { imageFileId: id },
    });

    await prisma.imageFile.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error deleting image file:", error);
    return NextResponse.json(
      { error: "Failed to delete image file" },
      { status: 500 }
    );
  }
}
