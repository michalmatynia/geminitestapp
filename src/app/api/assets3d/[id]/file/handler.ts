import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { getDiskPathFromPublicPath, isHttpFilepath } from '@/features/files/server';
import { getAsset3DRepository } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

export async function GET_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const repository = getAsset3DRepository();
  const asset = await repository.getAsset3DById(id);

  if (!asset?.filepath) {
    throw notFoundError(`Asset or filepath not found in database: ${id}`);
  }

  if (isHttpFilepath(asset.filepath)) {
    const response = await fetch(asset.filepath, { cache: 'no-store' });
    if (!response.ok) {
      throw notFoundError(`Remote file not found: ${asset.filepath}`);
    }
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': asset.mimetype || response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  const diskPath = getDiskPathFromPublicPath(asset.filepath);

  if (!existsSync(diskPath)) {
    throw notFoundError(`File not found on disk: ${diskPath}`);
  }

  const fileBuffer = await readFile(diskPath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': asset.mimetype || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
