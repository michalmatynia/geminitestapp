import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<void | { error: string }>> {
  const { id } = params;

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!imageFile) {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }

    // Delete associated ProductImage entries first
    await prisma.productImage.deleteMany({
      where: {
        imageFileId: id,
      },
    });

    // Then delete the ImageFile itself from the database
    await prisma.imageFile.delete({
      where: { id },
    });

    // Delete the physical file
    const filePath = path.join(process.cwd(), 'public', imageFile.filepath);
    await unlink(filePath);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error deleting image file:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete image file" }, { status: 500 });
  }
}
