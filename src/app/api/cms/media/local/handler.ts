import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

import mime from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getDiskPathFromPublicPath,
  getPublicPathFromStoredPath,
} from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { getMilkbarFastCometPublicHtmlMirrorPath } from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';

/**
 * CMS Local Media API Handlers
 *
 * HTTP request handlers for local CMS media storage.
 * Handlers: postHandler
 *
 * - Handles local file uploads for CMS media
 * - Manages local storage file operations
 * - Validates and processes media files
 */

export const querySchema = z.object({
  path: optionalTrimmedQueryString(),
});

const normalizeMilkbarCmsVisualisationPath = (value: string | undefined): string => {
  const publicPath = getPublicPathFromStoredPath(value ?? '')?.trim() ?? '';
  if (!publicPath.startsWith('/uploads/cms/visualisation/')) {
    throw badRequestError('Invalid Milkbar CMS media path.');
  }
  return publicPath;
};

const readLocalMediaFile = async (diskPath: string): Promise<Buffer | null> => {
  if (!existsSync(diskPath)) return null;
  return await readFile(diskPath);
};

const createMediaResponse = (fileBuffer: Buffer, diskPath: string): Response => {
  const contentType = mime.lookup(diskPath);
  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': typeof contentType === 'string' ? contentType : 'application/octet-stream',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'private, max-age=60',
    },
  });
};

const readPathParam = (params: ApiHandlerContext['params']): string | undefined => {
  const pathParam = params?.['path'];
  if (Array.isArray(pathParam)) return `/${pathParam.join('/')}`;
  if (typeof pathParam === 'string' && pathParam.length > 0) return `/${pathParam}`;
  return undefined;
};

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const publicPath = normalizeMilkbarCmsVisualisationPath(
    query.path ?? readPathParam(ctx.params)
  );

  const runtimeDiskPath = getDiskPathFromPublicPath(publicPath);
  const runtimeFile = await readLocalMediaFile(runtimeDiskPath);
  if (runtimeFile !== null) {
    return createMediaResponse(runtimeFile, runtimeDiskPath);
  }

  const publicHtmlDiskPath = getMilkbarFastCometPublicHtmlMirrorPath(publicPath);
  const publicHtmlFile = await readLocalMediaFile(publicHtmlDiskPath);
  if (publicHtmlFile !== null) {
    return createMediaResponse(publicHtmlFile, publicHtmlDiskPath);
  }

  throw notFoundError('Milkbar CMS media file not found locally.', { publicPath });
}
