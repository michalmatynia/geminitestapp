import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAsset3DRepository, uploadAsset3D, validate3DFile } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalCsvQueryStringArray,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const querySchema = z.object({
  filename: optionalTrimmedQueryString(),
  category: optionalTrimmedQueryString(),
  search: optionalTrimmedQueryString(),
  isPublic: optionalBooleanQuerySchema(),
  tags: optionalCsvQueryStringArray(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const repository = getAsset3DRepository();
  const assets = await repository.listAssets3D({
    ...(query.filename && { filename: query.filename }),
    ...(query.category && { category: query.category }),
    ...(query.search && { search: query.search }),
    ...(query.isPublic !== undefined && { isPublic: query.isPublic }),
    ...(query.tags && { tags: query.tags }),
  });

  return NextResponse.json(assets, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
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
