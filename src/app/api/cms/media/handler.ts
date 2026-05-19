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
import { getCmsBuilderImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * CMS Media API Handlers
 *
 * HTTP request handlers for CMS media file operations.
 * Handlers: getHandler, postHandler
 *
 * - Lists and uploads media files for CMS
 * - Manages media metadata and associations
 * - Handles file storage routing (local or remote)
 */


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

const resolveStagedUploadPathValue = (
  publicPath: string | null,
  primary: string | undefined,
  fallback: string
): string => {
  if (publicPath !== null) return publicPath;
  const trimmed = primary?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : fallback;
};

const stageMilkbarCmsMediaFile = async (
  file: File,
  input: {
    folder: string;
    milkbarStorage: ReturnType<typeof resolveMilkbarFastCometStorageProfile>;
  }
): Promise<ImageFileRecord> => {
  const upload = await uploadFile(file, {
    category: 'cms',
    allowOrphanRecord: true,
    folder: input.folder,
    forceStorageSource: 'local',
  });
  const publicPath = resolveUploadPublicPath(upload);
  const repository = await getCmsBuilderImageFileRepository();
  const updated = await repository.updateImageFile(upload.id, {
    filepath: resolveStagedUploadPathValue(publicPath, upload.filepath, upload.filepath),
    publicUrl: resolveStagedUploadPathValue(publicPath, upload.publicUrl, upload.filepath),
    url: resolveStagedUploadPathValue(publicPath, upload.url, upload.filepath),
    storageProvider: 'local',
    metadata: {
      ...(upload.metadata ?? {}),
      fastCometUploadStatus: 'queued',
      mirroredLocally: true,
      publicBaseUrl: input.milkbarStorage.publicBaseUrl,
      ...(publicPath !== null ? { publicPath } : {}),
      storageProfile: 'milkbarCms',
      storageSource: 'local',
    },
  });
  return updated ?? upload;
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
  if (input.isMilkbarCmsUpload) {
    const folder = input.folder ?? MILKBAR_CMS_VISUALISATION_FOLDER;
    const milkbarStorage = input.milkbarStorage ?? resolveMilkbarFastCometStorageProfile();
    const staged = await stageMilkbarCmsMediaFile(file, { folder, milkbarStorage });
    if (resolveUploadPublicPath(staged) === null) {
      throw badRequestError('Could not resolve staged CMS media path.', {
        imageFileId: staged.id,
      });
    }
    return staged;
  }

  const upload = await uploadFile(file, {
    category: 'cms',
    allowOrphanRecord: true,
    folder: input.folder,
  });

  return upload;
};

/**
 * API handler for POST /api/cms/media
 * Parses multipart form data, validates files, processes storage profiles,
 * and uploads media content.
 */
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
