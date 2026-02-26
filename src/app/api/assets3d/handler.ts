import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import {
  getAsset3DRepository,
  uploadAsset3D,
  validate3DFile,
} from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import { logger } from '@/shared/utils/logger';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const searchParams = getQueryParams(req);
  const filename = searchParams.get('filename');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const isPublicStr = searchParams.get('isPublic');
  const tagsStr = searchParams.get('tags');

  try {
    const repository = getAsset3DRepository();
    const assets = await repository.listAssets3D({
      ...(filename && { filename }),
      ...(category && { category }),
      ...(search && { search }),
      ...(isPublicStr && { isPublic: isPublicStr === 'true' }),
      ...(tagsStr && { tags: tagsStr.split(',').filter(Boolean) }),
    });

    return NextResponse.json(assets, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' ||
        error.code === 'P2022' ||
        error.code === 'P1001' ||
        error.code === 'P1003')
    ) {
      logger.warn(
        '[assets3d] Falling back to empty list due to missing table or database.',
        { code: error.code },
      );
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }
    throw error;
  }
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw badRequestError('Invalid form data');
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const category = formData.get('category') as string | null;
  const tagsStr = formData.get('tags') as string | null;
  const isPublicStr = formData.get('isPublic') as string | null;

  if (!file) {
    throw badRequestError('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw badRequestError('File size exceeds 100MB limit', {
      size: file.size,
      maxSize: MAX_FILE_SIZE,
    });
  }

  const validation = validate3DFile(file);
  if (!validation.valid) {
    throw badRequestError(validation.error ?? 'Invalid file type');
  }

  const asset = await uploadAsset3D(file, {
    ...(name && { name }),
    ...(description && { description }),
    ...(category && { category }),
    ...(tagsStr && { tags: tagsStr.split(',').filter(Boolean) }),
    isPublic: isPublicStr === 'true',
  });

  return NextResponse.json(asset, { status: 201 });
}
