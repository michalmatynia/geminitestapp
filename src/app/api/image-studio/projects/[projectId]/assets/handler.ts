import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getImageFileRepository } from '@/features/files/server';
import { uploadFile } from '@/shared/lib/files/file-uploader';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const toTimestamp = (value: string | Date | null | undefined): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

function normalizeStudioPublicPath(filepath: string | null | undefined): string | null {
  const raw = typeof filepath === 'string' ? filepath.trim() : '';
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return normalizeStudioPublicPath(url.pathname);
    } catch {
      return raw;
    }
  }

  let normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('public/')) {
    normalized = `/${normalized}`;
  }
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  } else if (normalized.startsWith('uploads/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

type UploadedFileLike = File | (Blob & { name?: string });

function isFileLike(value: unknown): value is UploadedFileLike {
  if (!value || typeof value !== 'object') return false;
  const blob = value as Blob;
  return typeof blob.arrayBuffer === 'function';
}

function extractUploadedFiles(formData: FormData): UploadedFileLike[] {
  const candidates = [
    ...formData.getAll('files'),
    ...formData.getAll('files[]'),
    ...formData.getAll('file'),
  ] as unknown[];

  // Fallback: some clients use different field names for multipart file payloads.
  for (const [key, value] of formData.entries()) {
    const lower = key.toLowerCase();
    if (!lower.includes('file')) continue;
    candidates.push(value as unknown);
  }

  const unique = new Set<UploadedFileLike>();
  candidates.forEach((value: unknown) => {
    if (isFileLike(value)) unique.add(value);
  });
  return Array.from(unique);
}

async function listStudioAssetsFromDisk(projectId: string): Promise<ImageFileRecord[]> {
  const projectDir = path.join(projectsRoot, projectId);
  const results: ImageFileRecord[] = [];

  const stack: Array<{ diskDir: string; relDir: string }> = [{ diskDir: projectDir, relDir: '' }];

  while (stack.length > 0) {
    const { diskDir, relDir } = stack.pop()!;
    const entries = await fs.readdir(diskDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const diskPath = path.join(diskDir, entry.name);
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push({ diskDir: diskPath, relDir: relPath });
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = await fs.stat(diskPath).catch(() => null);
      if (!stats) continue;
      const filepath = `/uploads/studio/${projectId}/${relPath}`.replace(/\\/g, '/');
      results.push({
        id: `disk:${filepath}`,
        name: entry.name,
        filename: entry.name,
        filepath,
        mimetype: 'application/octet-stream',
        size: stats.size,
        tags: [],
        createdAt: (stats.birthtime ?? stats.ctime).toISOString(),
        updatedAt: (stats.mtime ?? stats.ctime).toISOString(),
      });
    }
  }

  return results;
}

async function listStudioFoldersFromDisk(projectId: string): Promise<string[]> {
  const projectDir = path.join(projectsRoot, projectId);
  const folders: string[] = [];
  const stack: Array<{ diskDir: string; relDir: string }> = [{ diskDir: projectDir, relDir: '' }];

  while (stack.length > 0) {
    const { diskDir, relDir } = stack.pop()!;
    const entries = await fs.readdir(diskDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      folders.push(relPath);
      stack.push({ diskDir: path.join(diskDir, entry.name), relDir: relPath });
    }
  }

  return folders.sort((a, b) => a.localeCompare(b));
}

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const prefix = `/uploads/studio/${projectId}/`;
  let repoAssets: ImageFileRecord[];
  try {
    const imageFileRepository = await getImageFileRepository();
    const files = await imageFileRepository.listImageFiles();
    repoAssets = files
      .map((file: ImageFileRecord) => {
        const normalized = normalizeStudioPublicPath(file.filepath);
        if (!normalized?.startsWith(prefix)) return null;
        return normalized === file.filepath ? file : { ...file, filepath: normalized };
      })
      .filter(Boolean) as ImageFileRecord[];
  } catch {
    // If repository/DB is down, we still want to show disk assets.
    repoAssets = [];
  }

  let diskAssets: ImageFileRecord[];
  let diskFolders: string[];
  try {
    diskAssets = await listStudioAssetsFromDisk(projectId);
  } catch {
    diskAssets = [];
  }
  try {
    diskFolders = await listStudioFoldersFromDisk(projectId);
  } catch {
    diskFolders = [];
  }

  const byFilepath = new Map<string, ImageFileRecord>();
  repoAssets.forEach((asset) => {
    if (typeof asset.filepath === 'string' && asset.filepath.startsWith(prefix)) {
      byFilepath.set(asset.filepath, asset);
    }
  });
  diskAssets.forEach((asset) => {
    if (!byFilepath.has(asset.filepath)) {
      byFilepath.set(asset.filepath, asset);
    }
  });

  const result = Array.from(byFilepath.values()).sort((a, b) => {
    const diff = toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
    if (diff !== 0) return diff;
    return b.filepath.localeCompare(a.filepath);
  });

  return NextResponse.json({ assets: result, folders: diskFolders });
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const formData = await req.formData();
  const folder = formData.get('folder');
  const files = extractUploadedFiles(formData);
  if (files.length === 0) {
    throw badRequestError('No files provided');
  }

  const uploaded: ImageFileRecord[] = [];
  const failures: Array<{ filename: string; error: string }> = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const fileName = typeof (file as File).name === 'string' ? (file as File).name : 'upload.bin';
    try {
      const record = await uploadFile(file as File, {
        category: 'studio',
        projectId,
        folder: typeof folder === 'string' ? folder : null,
        allowOrphanRecord: true,
        filenameOverride: fileName,
      });
      uploaded.push(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      failures.push({ filename: fileName, error: message });
    }
  }

  if (failures.length > 0) {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn(`[image-studio.assets.upload] ${failures.length} files failed to upload`, {
      projectId,
      failures: failures.slice(0, 5),
      totalFailures: failures.length
    });
  }

  if (uploaded.length === 0) {
    const firstFailure = failures[0]?.error?.trim();
    throw badRequestError(
      firstFailure ? `Upload failed: ${firstFailure}` : 'Upload failed',
      { failures }
    );
  }

  return NextResponse.json({ uploaded, failures }, { status: 201 });
}

