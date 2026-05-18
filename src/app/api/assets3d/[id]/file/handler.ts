import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import type { LookupFunction } from 'net';

import { Agent, type Dispatcher } from 'undici';

import { type NextRequest, NextResponse } from 'next/server';

import {
  getDiskPathFromPublicPath,
  getPublicPathFromStoredPath,
  isHttpFilepath,
} from '@/features/files/server';
import { getAsset3DFromLookupRepositories } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { notFoundError } from '@/shared/errors/app-error';
import { getMilkbarFastCometPublicHtmlMirrorPath } from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
import { normalizeFastCometIpAddress } from '@/shared/lib/files/services/storage/fastcomet-storage-config';

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

const createFileResponse = (
  fileBuffer: Buffer,
  contentType: string | undefined
): Response =>
  new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });

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

const getResponseContentType = (asset: Asset3DRecord, response: Response): string | undefined => {
  const assetMimetype = asset.mimetype?.trim() ?? '';
  if (assetMimetype.length > 0) return assetMimetype;
  return response.headers.get('content-type') ?? undefined;
};

const createLookup =
  (resolveIp: string, family: 4 | 6): LookupFunction =>
  (_hostname, options, callback): void => {
    if (options.all === true) {
      callback(null, [{ address: resolveIp, family }]);
      return;
    }
    callback(null, resolveIp, family);
  };

const createIpDispatcher = (resolveIp: string | null | undefined): Dispatcher | undefined => {
  const normalized = normalizeFastCometIpAddress(resolveIp);
  if (normalized === null) return undefined;
  const family = normalized.includes(':') ? 6 : 4;
  return new Agent({ connect: { lookup: createLookup(normalized, family) } });
};

const withDispatcher = (
  init: RequestInit,
  dispatcher: Dispatcher | undefined
): RequestInit & { dispatcher?: Dispatcher } =>
  dispatcher === undefined ? init : { ...init, dispatcher };

const closeDispatcher = async (dispatcher: Dispatcher | undefined): Promise<void> => {
  if (dispatcher !== undefined) await dispatcher.close().catch(() => undefined);
};

const buildMilkbarFastCometOriginUrl = (publicPath: string): {
  dispatcher: Dispatcher | undefined;
  url: string;
} | null => {
  const milkbarStorage = resolveMilkbarFastCometStorageProfile();
  const server = milkbarStorage.fastCometConfig.server?.trim() ?? '';
  if (server.length === 0) return null;

  const base = new URL(milkbarStorage.publicBaseUrl);
  const url = new URL(publicPath, `${base.protocol}//${server}/`).toString();
  return {
    url,
    dispatcher: createIpDispatcher(milkbarStorage.fastCometConfig.resolveIp),
  };
};

const fetchMilkbarFastCometOriginFile = async (
  asset: Asset3DRecordWithFilepath
): Promise<Response | null> => {
  const publicPath = resolveMirroredPublicPath(asset);
  const storageProfile = getMetadataString(asset.metadata, 'storageProfile');
  if (publicPath === null || storageProfile !== 'milkbarCms') return null;

  const target = buildMilkbarFastCometOriginUrl(publicPath);
  if (target === null) return null;

  try {
    const response = await fetch(
      target.url,
      withDispatcher({ cache: 'no-store' }, target.dispatcher)
    );
    if (!response.ok) return null;
    return createFileResponse(
      Buffer.from(await response.arrayBuffer()),
      getResponseContentType(asset, response)
    );
  } finally {
    await closeDispatcher(target.dispatcher);
  }
};

const fetchRemoteAssetFile = async (asset: Asset3DRecordWithFilepath): Promise<Response> => {
  const milkbarOriginResponse = await fetchMilkbarFastCometOriginFile(asset);
  if (milkbarOriginResponse !== null) return milkbarOriginResponse;

  try {
    const response = await fetch(asset.filepath, { cache: 'no-store' });
    if (response.ok) {
      return createFileResponse(
        Buffer.from(await response.arrayBuffer()),
        getResponseContentType(asset, response)
      );
    }
  } catch {
    const fallback = await fetchMilkbarFastCometOriginFile(asset);
    if (fallback !== null) return fallback;
    throw notFoundError(`Remote file not found: ${asset.filepath}`);
  }

  const fallback = await fetchMilkbarFastCometOriginFile(asset);
  if (fallback !== null) return fallback;
  throw notFoundError(`Remote file not found: ${asset.filepath}`);
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
    asset.filepath != null ? getPublicPathFromStoredPath(asset.filepath) : null,
    asset.fileUrl != null ? getPublicPathFromStoredPath(asset.fileUrl) : null,
  ];
  const publicPath = candidates.find(
    (p): p is string => typeof p === 'string' && p.startsWith('/uploads/cms/models/')
  );
  if (publicPath === undefined) return null;

  const { publicBaseUrl } = resolveMilkbarFastCometStorageProfile();
  return `${publicBaseUrl.replace(/\/$/, '')}${publicPath}`;
};

export async function getHandler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const asset = await getRequiredAsset(id);

  const mirroredResponse = await readMirroredAssetFile(asset);
  if (mirroredResponse !== null) return mirroredResponse;

  const cdnRedirectUrl = resolveMilkbarCdnRedirectUrl(asset);
  if (cdnRedirectUrl !== null) {
    return NextResponse.redirect(cdnRedirectUrl, { status: 302 });
  }

  if (isHttpFilepath(asset.filepath)) {
    return NextResponse.redirect(asset.filepath, { status: 302 });
  }

  return await readRequiredDiskAssetFile(asset);
}
