import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAsset3DRepository, uploadAsset3D, validate3DFile } from '@/features/viewer3d/server';
import { deleteMilkbarAsset3DInRedisRuntime } from '@/features/viewer3d/workers/milkbarAsset3DDeleteQueue';
import type { Asset3DListFilters, Asset3DRecord } from '@/shared/contracts/viewer3d';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import {
  fileStorageProfileValues,
  type FileStorageProfile,
} from '@/shared/lib/files/constants';
import {
  optionalBooleanQuerySchema,
  optionalCsvQueryStringArray,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const querySchema = z.object({
  filename: optionalTrimmedQueryString(),
  category: optionalTrimmedQueryString(),
  search: optionalTrimmedQueryString(),
  isPublic: optionalBooleanQuerySchema(),
  tags: optionalCsvQueryStringArray(),
  storageProfile: z.enum(fileStorageProfileValues).optional(),
});

type Asset3DListQuery = {
  filename: string | null;
  category: string | null;
  search: string | null;
  isPublic: boolean | null;
  tags: string[];
  storageProfile?: FileStorageProfile;
};

const readStorageProfile = (value: FormDataEntryValue | null): FileStorageProfile => {
  if (typeof value !== 'string' || value.trim().length === 0) return 'default';
  const trimmed = value.trim();
  if (fileStorageProfileValues.includes(trimmed as FileStorageProfile)) {
    return trimmed as FileStorageProfile;
  }
  throw badRequestError('Invalid storage profile.', { storageProfile: trimmed });
};

const toAssetListFilters = (query: Asset3DListQuery): Asset3DListFilters => {
  const filters: Asset3DListFilters = {};
  const textFilters: Array<[keyof Pick<Asset3DListFilters, 'filename' | 'categoryId' | 'search'>, string | null]> = [
    ['filename', query.filename],
    ['categoryId', query.category],
    ['search', query.search],
  ];
  textFilters.forEach(([key, value]) => {
    if (value !== null && value.length > 0) {
      filters[key] = value;
    }
  });
  if (query.isPublic !== null) filters.isPublic = query.isPublic;
  if (query.tags.length > 0) filters.tags = query.tags;
  if (query.storageProfile !== undefined) filters.storageProfile = query.storageProfile;
  return filters;
};

async function listAssets3DCached(query: Asset3DListQuery): Promise<Asset3DRecord[]> {
  'use cache';
  applyCacheLife('swr60');

  const repository = getAsset3DRepository({ storageProfile: query.storageProfile });
  return repository.listAssets3D(toAssetListFilters(query));
}

const readOptionalFormText = (formData: FormData, key: string): string | null => {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildAssetUploadOptions = (formData: FormData): NonNullable<Parameters<typeof uploadAsset3D>[1]> => {
  const name = readOptionalFormText(formData, 'name');
  const description = readOptionalFormText(formData, 'description');
  const category = readOptionalFormText(formData, 'category');
  const tagsStr = readOptionalFormText(formData, 'tags');
  const isPublicStr = readOptionalFormText(formData, 'isPublic');
  const options: NonNullable<Parameters<typeof uploadAsset3D>[1]> = {
    isPublic: isPublicStr === 'true',
    storageProfile: readStorageProfile(formData.get('storageProfile')),
  };
  if (name !== null) options.name = name;
  if (description !== null) options.description = description;
  if (category !== null) options.category = category;
  if (tagsStr !== null) options.tags = tagsStr.split(',').filter(Boolean);
  return options;
};

const readReplacementAssetId = (formData: FormData): string | null =>
  readOptionalFormText(formData, 'replaceAssetId');

/**
 * API handler for GET /api/assets3d
 * Fetches and returns a filtered list of 3D assets from cache.
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const assets = await listAssets3DCached({
    filename: query.filename ?? null,
    category: query.category ?? null,
    search: query.search ?? null,
    isPublic: query.isPublic ?? null,
    tags: query.tags ?? [],
    storageProfile: query.storageProfile,
  });

  return NextResponse.json(assets, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

/**
 * API handler for POST /api/assets3d
 * Parses form data, validates file, and uploads a new 3D asset.
 */
export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid form data');
  }

  const file = formData.get('file') as File | null;
  if (file === null) {
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

  const uploadOptions = buildAssetUploadOptions(formData);
  const replaceAssetId = readReplacementAssetId(formData);
  const asset =
    uploadOptions.storageProfile === 'milkbarCms'
      ? await uploadMilkbarAsset3DFileInRedisRuntime(file, uploadOptions, replaceAssetId)
      : await uploadAsset3D(file, uploadOptions);

  return NextResponse.json(asset, { status: 201 });
}

const uploadMilkbarAsset3DFileInRedisRuntime = async (
  file: File,
  uploadOptions: NonNullable<Parameters<typeof uploadAsset3D>[1]>,
  replaceAssetId: string | null
): Promise<Asset3DRecord> => {
  if (replaceAssetId !== null) {
    await deleteMilkbarAsset3DInRedisRuntime({
      assetId: replaceAssetId,
      requestedAt: new Date().toISOString(),
    });
  }
  const stagedAsset = await uploadAsset3D(file, {
    ...uploadOptions,
    storageSource: 'local',
    metadata: {
      ...(uploadOptions.metadata ?? {}),
      fastCometUploadStatus: 'queued',
    },
  });
  return stagedAsset;
};
