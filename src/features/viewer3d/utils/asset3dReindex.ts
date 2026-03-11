import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { getAsset3DRepository } from '@/features/viewer3d/services/asset3d-repository';

import { SUPPORTED_3D_FORMATS, type Supported3DExtension } from './validateAsset3d';

const assets3dDiskDir = path.join(process.cwd(), 'public', 'uploads', 'assets3d');
const assets3dPublicDir = '/uploads/assets3d';

const isSupported3DFile = (filename: string): filename is string => {
  const ext = `.${filename.split('.').pop() ?? ''}`.toLowerCase() as Supported3DExtension;
  return ext in SUPPORTED_3D_FORMATS;
};

const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const deriveAssetName = (filename: string): string | null => {
  // Common uploader pattern: `${Date.now()}-${originalName}`
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const withoutTimestampPrefix = withoutExt.replace(/^\d{10,}-/, '');
  const cleaned = withoutTimestampPrefix.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return toTitleCase(cleaned);
};

export async function reindexAsset3DUploadsFromDisk(): Promise<{
  diskFiles: number;
  supportedFiles: number;
  existingRecords: number;
  created: number;
  skipped: number;
  createdIds: string[];
}> {
  const entries: import('fs').Dirent[] = await fs
    .readdir(assets3dDiskDir, { withFileTypes: true })
    .catch(() => []);
  const diskFiles: string[] = entries
    .filter((entry: import('fs').Dirent) => entry.isFile())
    .map((entry: import('fs').Dirent) => entry.name);
  const supported: string[] = diskFiles.filter(isSupported3DFile);

  if (supported.length === 0) {
    return {
      diskFiles: diskFiles.length,
      supportedFiles: 0,
      existingRecords: 0,
      created: 0,
      skipped: 0,
      createdIds: [],
    };
  }

  const repository = getAsset3DRepository();
  const existingAssets = await repository.listAssets3D();
  const supportedNames = new Set<string>(supported);
  const existingNames: Set<string> = new Set(
    existingAssets
      .map((asset) => asset.filename)
      .filter((filename): filename is string => Boolean(filename && supportedNames.has(filename)))
  );

  const missing: string[] = supported.filter((filename: string) => !existingNames.has(filename));
  if (missing.length === 0) {
    return {
      diskFiles: diskFiles.length,
      supportedFiles: supported.length,
      existingRecords: existingNames.size,
      created: 0,
      skipped: supported.length,
      createdIds: [],
    };
  }

  const createdIds: string[] = [];
  for (const filename of missing) {
    const ext = `.${filename.split('.').pop() ?? ''}`.toLowerCase() as Supported3DExtension;
    const format = SUPPORTED_3D_FORMATS[ext];
    const stat = await fs.stat(path.join(assets3dDiskDir, filename));
    const record = await repository.createAsset3D({
      name: deriveAssetName(filename) ?? filename,
      description: null,
      filename,
      filepath: `${assets3dPublicDir}/${filename}`,
      fileUrl: `${assets3dPublicDir}/${filename}`,
      mimetype: format?.mimetype ?? 'application/octet-stream',
      size: stat.size,
      fileSize: stat.size,
      format: ext.slice(1),
      tags: [],
      categoryId: null,
      metadata: {},
      isPublic: false,
    });
    createdIds.push(record.id);
  }

  return {
    diskFiles: diskFiles.length,
    supportedFiles: supported.length,
    existingRecords: existingNames.size,
    created: createdIds.length,
    skipped: supported.length - missing.length,
    createdIds,
  };
}
