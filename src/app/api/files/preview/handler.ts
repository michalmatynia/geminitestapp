import fs from 'fs/promises';

import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';

import {
  getDiskPathFromPublicPath,
  getImageFileRepository,
  isHttpFilepath,
} from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

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

  let localPath: string | null = null;
  try {
    localPath = getDiskPathFromPublicPath(imageFile.filepath);
  } catch {
    localPath = null;
  }

  if (localPath) {
    try {
      const fileBuffer = await fs.readFile(localPath);
      const mimeType = mime.lookup(localPath) || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  }

  if (isHttpFilepath(imageFile.filepath)) {
    const response = await fetch(imageFile.filepath, { cache: 'no-store' });
    if (!response.ok) {
      throw notFoundError('File not found on remote storage', {
        path: imageFile.filepath,
      });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get('content-type') ||
      mime.lookup(imageFile.filepath) ||
      'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  throw notFoundError('File not found on disk', {
    path: imageFile.filepath,
  });
}
