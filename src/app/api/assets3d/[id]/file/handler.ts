import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

import { type NextRequest, NextResponse } from 'next/server';

import {
  getDiskPathFromPublicPath,
  getPublicPathFromStoredPath,
  isHttpFilepath,
} from '@/features/files/server';
import { getAsset3DFromLookupRepositories } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { externalServiceError, notFoundError } from '@/shared/errors/app-error';
import { getMilkbarFastCometPublicHtmlMirrorPath } from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';

type Asset3DRecordWithFilepath = Asset3DRecord & { filepath: string };

const getMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string
): string | null => {
  const value = metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toUploadPublicPath = (value: string | null): string | null => {
  if (value === null) return null;
  const publicPath = getPublicPathFromStoredPath(value);
  return publicPath?.startsWith('/uploads/') === true ? publicPath : null;
};

const resolveMirroredPublicPath = (asset: Asset3DRecord): string | null => {
  const metadataPath = toUploadPublicPath(getMetadataString(asset.metadata, 'publicPath'));
  if (metadataPath !== null) return metadataPath;

  const filepath = asset.filepath ?? '';
  if (filepath.length === 0) return null;

  const publicPath = getPublicPathFromStoredPath(filepath);
  if (publicPath === null) return null;
  if (!isHttpFilepath(filepath)) return publicPath;
  return publicPath.startsWith('/uploads/') ? publicPath : null;
};

const createFileHeaders = (contentType: string | undefined): Headers => {
  const headers = new Headers({
    'Content-Type': contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000',
  });
  return headers;
};

const createFileResponse = (fileBuffer: Buffer, contentType: string | undefined): Response =>
  new NextResponse(new Uint8Array(fileBuffer), {
    headers: createFileHeaders(contentType),
  });

const proxyRemoteFileResponse = async ({
  contentType,
  request,
  url,
}: {
  contentType: string | undefined;
  request: NextRequest;
  url: string;
}): Promise<Response> => {
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    });
  } catch (error) {
    throw externalServiceError(
      'The remote 3D model file could not be fetched. Confirm the FastComet upload exists and try previewing again.',
      {
        cause: error instanceof Error ? error.message : String(error),
        url,
      }
    );
  }

  if (!response.ok) {
    throw externalServiceError(
      'The remote 3D model file is not reachable. Confirm the FastComet upload exists and try previewing again.',
      {
        status: response.status,
        url,
      }
    );
  }

  const headers = createFileHeaders(response.headers.get('content-type') ?? contentType);
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) headers.set('Content-Length', contentLength);

  if (request.method === 'HEAD') {
    return new NextResponse(null, {
      headers,
      status: 200,
    });
  }

  return new NextResponse(new Uint8Array(await response.arrayBuffer()), { headers });
};

const readExistingDiskFileResponse = async (
  diskPath: string,
  contentType: string | undefined
): Promise<Response | null> => {
  if (!existsSync(diskPath)) return null;
  return createFileResponse(await readFile(diskPath), contentType);
};

const shouldReadMilkbarPublicHtmlMirror = (
  asset: Asset3DRecord,
  publicPath: string
): boolean =>
  getMetadataString(asset.metadata, 'storageProfile') === 'milkbarCms' &&
  publicPath.startsWith('/uploads/cms/models/');

const readMirroredAssetFile = async (asset: Asset3DRecord): Promise<Response | null> => {
  const publicPath = resolveMirroredPublicPath(asset);
  if (publicPath === null) return null;

  const uploadMirrorResponse = await readExistingDiskFileResponse(
    getDiskPathFromPublicPath(publicPath),
    asset.mimetype
  );
  if (uploadMirrorResponse !== null) return uploadMirrorResponse;

  if (!shouldReadMilkbarPublicHtmlMirror(asset, publicPath)) return null;
  return await readExistingDiskFileResponse(
    getMilkbarFastCometPublicHtmlMirrorPath(publicPath),
    asset.mimetype
  );
};

const getRequiredAsset = async (id: string): Promise<Asset3DRecordWithFilepath> => {
  const asset = await getAsset3DFromLookupRepositories(id);
  const filepath = asset?.filepath?.trim() ?? '';
  if (asset === null || filepath.length === 0) {
    throw notFoundError(`Asset or filepath not found in database: ${id}`);
  }
  return { ...asset, filepath };
};

const readRequiredDiskAssetFile = async (asset: Asset3DRecordWithFilepath): Promise<Response> => {
  const diskPath = getDiskPathFromPublicPath(asset.filepath);
  if (!existsSync(diskPath)) {
    throw notFoundError(`File not found on disk: ${diskPath}`);
  }
  return createFileResponse(await readFile(diskPath), asset.mimetype);
};

const resolveMilkbarCdnRedirectUrl = (asset: Asset3DRecord): string | null => {
  if (getMetadataString(asset.metadata, 'storageProfile') !== 'milkbarCms') return null;

  const candidates = [
    getMetadataString(asset.metadata, 'publicPath'),
    asset.filepath !== undefined
      ? getPublicPathFromStoredPath(asset.filepath)
      : null,
    asset.fileUrl !== undefined
      ? getPublicPathFromStoredPath(asset.fileUrl)
      : null,
  ];
  const publicPath = candidates.find(
    (p): p is string => typeof p === 'string' && p.startsWith('/uploads/cms/models/')
  );
  if (publicPath === undefined) return null;

  const { publicBaseUrl } = resolveMilkbarFastCometStorageProfile();
  return `${publicBaseUrl.replace(/\/$/, '')}${publicPath}`;
};

export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const asset = await getRequiredAsset(id);

  const mirroredResponse = await readMirroredAssetFile(asset);
  if (mirroredResponse !== null) return mirroredResponse;

  const cdnRedirectUrl = resolveMilkbarCdnRedirectUrl(asset);
  if (cdnRedirectUrl !== null) {
    return await proxyRemoteFileResponse({
      contentType: asset.mimetype,
      request,
      url: cdnRedirectUrl,
    });
  }

  if (isHttpFilepath(asset.filepath)) {
    return NextResponse.redirect(asset.filepath, 302);
  }

  return await readRequiredDiskAssetFile(asset);
}
