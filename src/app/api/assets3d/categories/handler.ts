import { type NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  fileStorageProfileValues,
  type FileStorageProfile,
} from '@/shared/lib/files/constants';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const storageProfile = readStorageProfile(_req);
  const repository = getAsset3DRepository({ storageProfile });
  const categories = await repository.getCategories();
  return NextResponse.json(categories);
}

const readStorageProfile = (req: NextRequest): FileStorageProfile | undefined => {
  const value = req.nextUrl.searchParams.get('storageProfile')?.trim();
  if (value === undefined || value.length === 0) return undefined;
  return fileStorageProfileValues.includes(value as FileStorageProfile)
    ? (value as FileStorageProfile)
    : undefined;
};
