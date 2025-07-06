import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!imageFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete the file from the filesystem
    const relativePath = imageFile.filepath.startsWith('/') ? imageFile.filepath.substring(1) : imageFile.filepath;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the ImageFile record from the database
    await prisma.imageFile.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}