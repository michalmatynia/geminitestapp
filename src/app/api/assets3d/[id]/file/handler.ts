import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
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

  const diskPath = join(process.cwd(), 'public', asset.filepath.replace(/^\/+/, ''));

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
