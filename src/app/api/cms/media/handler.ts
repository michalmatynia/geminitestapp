import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPublicPathFromStoredPath, uploadFile } from '@/features/files/server';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import {
  MILKBAR_CMS_VISUALISATION_FOLDER,
  fileStorageProfileValues,
  type FileStorageProfile,
} from '@/shared/lib/files/constants';
import { writeMilkbarFastCometPublicHtmlMirrorFile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && 'arrayBuffer' in entry && 'size' in entry;
};

const readFormText = (formData: FormData, key: string): string | null => {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readStorageProfile = (formData: FormData): FileStorageProfile => {
  const value = readFormText(formData, 'storageProfile') ?? 'default';
  if (fileStorageProfileValues.includes(value as FileStorageProfile)) {
    return value as FileStorageProfile;
  }
  throw badRequestError('Invalid storage profile.', { storageProfile: value });
};

const readUploadMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null => {
  const value = metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveUploadPublicPath = (upload: ImageFileRecord): string | null => {
  const metadataPath = readUploadMetadataString(upload.metadata, 'publicPath');
  if (metadataPath !== null) return metadataPath;
  return getPublicPathFromStoredPath(upload.filepath);
};

const mirrorMilkbarCmsMediaToPublicHtml = async (
  file: File,
  upload: ImageFileRecord
): Promise<void> => {
  const publicPath = resolveUploadPublicPath(upload);
  if (publicPath?.startsWith('/uploads/cms/visualisation/') !== true) return;
  await writeMilkbarFastCometPublicHtmlMirrorFile(
    publicPath,
    Buffer.from(await file.arrayBuffer())
  );
};

/**
 * Uploads a CMS media file, applying storage profile logic.
 */
const uploadCmsMediaFile = async (
  file: File,
  input: {
    folder: string | null;
    isMilkbarCmsUpload: boolean;
    milkbarStorage: ReturnType<typeof resolveMilkbarFastCometStorageProfile> | null;
  }
): Promise<ImageFileRecord> => {
  const upload = await uploadFile(file, {
    category: 'cms',
    allowOrphanRecord: true,
    folder: input.folder,
    ...(input.isMilkbarCmsUpload
      ? {
          forceStorageSource: 'fastcomet' as const,
          fastCometBaseUrl: input.milkbarStorage?.publicBaseUrl,
          fastCometConfig: input.milkbarStorage?.fastCometConfig,
        }
      : {}),
  });

  if (input.isMilkbarCmsUpload) {
    await mirrorMilkbarCmsMediaToPublicHtml(file, upload);
  }

  return upload;
};

/**
 * API handler for POST /api/cms/media
 * Parses multipart form data, validates files, processes storage profiles,
 * and uploads media content.
 */
export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid form data', { error });
  }

  const entries = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('image'),
  ];

  const files = entries.filter(isFileLike);

  if (files.length === 0) {
    throw badRequestError('No file provided');
  }

  const storageProfile = readStorageProfile(formData);
  const isMilkbarCmsUpload = storageProfile === 'milkbarCms';
  const folder = isMilkbarCmsUpload
    ? MILKBAR_CMS_VISUALISATION_FOLDER
    : readFormText(formData, 'folder');
  const milkbarStorage = isMilkbarCmsUpload ? resolveMilkbarFastCometStorageProfile() : null;

  const uploads = await Promise.all(
    files.map((file) =>
      uploadCmsMediaFile(file, {
        folder,
        isMilkbarCmsUpload,
        milkbarStorage,
      })
    )
  );
  const payload = uploads.length === 1 ? uploads[0] : uploads;
  z.unknown().parse(payload);

  return NextResponse.json(payload, { status: 201 });
}
