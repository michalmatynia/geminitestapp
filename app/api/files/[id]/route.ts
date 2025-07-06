import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<{ error: string } | null>> {
  const { id } = params;

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!imageFile) {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), 'public', imageFile.filepath);

    try {
      await fs.unlink(filepath);
    } catch (error: NodeJS.ErrnoException) {
      if (error.code !== 'ENOENT') {
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
    return NextResponse.json({ error: "Failed to delete image file" }, { status: 500 });
  }
}
