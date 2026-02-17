import fs from 'fs';
import path from 'path';

import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';

import { getImageFileRepository } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const fileId = req.nextUrl.searchParams.get('fileId');

  if (!fileId) {
    throw badRequestError('File ID is required');
  }

  const imageFileRepository = await getImageFileRepository();
  const imageFile = await imageFileRepository.getImageFileById(fileId);

  if (!imageFile) {
    throw notFoundError('File not found');
  }

  // Remove leading slash from the stored path to ensure correct joining
  const relativePath = imageFile.filepath.startsWith('/')
    ? imageFile.filepath.substring(1)
    : imageFile.filepath;
  const filePath = path.join(process.cwd(), 'public', relativePath);

  if (!fs.existsSync(filePath)) {
    throw notFoundError('File not found on disk', { path: relativePath });
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
}
