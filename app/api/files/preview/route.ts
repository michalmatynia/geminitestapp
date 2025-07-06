import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }

  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id: fileId },
    });

    if (!imageFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Remove leading slash from the stored path to ensure correct joining
    const relativePath = imageFile.filepath.startsWith('/') ? imageFile.filepath.substring(1) : imageFile.filepath;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at constructed path: ${filePath}`);
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching file preview:', error);
    return NextResponse.json({ error: 'Failed to fetch file preview' }, { status: 500 });
  }
}
