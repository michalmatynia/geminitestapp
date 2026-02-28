import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { Prisma } from '@prisma/client';

import prisma from '@/shared/lib/db/prisma';

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
  const cleaned = withoutTimestampPrefix
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const entries: import('fs').Dirent[] = await fs.readdir(assets3dDiskDir, { withFileTypes: true }).catch(() => []);
  const diskFiles: string[] = entries.filter((entry: import('fs').Dirent) => entry.isFile()).map((entry: import('fs').Dirent) => entry.name);
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

  const existing: Array<{ filename: string }> = await prisma.asset3D.findMany({
    where: { filename: { in: supported } },
    select: { filename: true },
  });
  const existingNames: Set<string> = new Set(existing.map((row: { filename: string }) => row.filename));

  const missing: string[] = supported.filter((filename: string) => !existingNames.has(filename));
  if (missing.length === 0) {
    return {
      diskFiles: diskFiles.length,
      supportedFiles: supported.length,
      existingRecords: existing.length,
      created: 0,
      skipped: supported.length,
      createdIds: [],
    };
  }

  const createdIds: string[] = [];
  const created: number = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<number> => {
    let createdCount = 0;
    for (const filename of missing) {
      const ext = `.${filename.split('.').pop() ?? ''}`.toLowerCase() as Supported3DExtension;
      const format = SUPPORTED_3D_FORMATS[ext];
      const stat = await fs.stat(path.join(assets3dDiskDir, filename));

      const record = await tx.asset3D.create({
        data: {
          name: deriveAssetName(filename),
          description: null,
          filename,
          filepath: `${assets3dPublicDir}/${filename}`,
          mimetype: format?.mimetype ?? 'application/octet-stream',
          size: stat.size,
          tags: [],
          category: null,
          metadata: Prisma.JsonNull,
          isPublic: false,
        },
        select: { id: true },
      });
      createdIds.push(record.id);
      createdCount++;
    }
    return createdCount;
  });

  return {
    diskFiles: diskFiles.length,
    supportedFiles: supported.length,
    existingRecords: existing.length,
    created,
    skipped: supported.length - missing.length,
    createdIds,
  };
}
