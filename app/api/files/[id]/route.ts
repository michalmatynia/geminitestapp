import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const prisma = new PrismaClient();
  const { id } = params;

  try {
    const file = await prisma.imageFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Physical file deletion
    const filePath = path.join(process.cwd(), 'public', file.filepath);
    await fs.unlink(filePath);

    // Database record deletion
    await prisma.imageFile.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting file ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}