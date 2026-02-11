export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getImageFileRepository } from '@/features/files/server';
import { uploadFile } from '@/features/files/utils/fileUploader';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ImageFileRecord } from '@/shared/types/domain/files';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

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
  const publicPrefix = `/uploads/studio/${projectId}`;
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
      const filepath = `${publicPrefix}/${relPath}`.replace(/\\/g, '/');
      const createdAt = (stats.birthtime ?? stats.ctime).toISOString();
      const updatedAt = (stats.mtime ?? stats.ctime).toISOString();
      results.push({
        id: `disk:${filepath}`,
        filename: entry.name,
        filepath,
        mimetype: 'application/octet-stream',
        size: stats.size,
        width: null,
        height: null,
        tags: [],
        createdAt,
        updatedAt,
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

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const prefix = `/uploads/studio/${projectId}/`;
  let repoAssets: ImageFileRecord[] = [];
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

  let diskAssets: ImageFileRecord[] = [];
  let diskFolders: string[] = [];
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

  const result = Array.from(byFilepath.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ assets: result, folders: diskFolders });
}

async function POST_handler(
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

  if (uploaded.length === 0) {
    const firstFailure = failures[0]?.error?.trim();
    throw badRequestError(
      firstFailure ? `Upload failed: ${firstFailure}` : 'Upload failed',
      { failures }
    );
  }

  return NextResponse.json({ uploaded, failures }, { status: 201 });
}

export const GET = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    GET_handler(req, ctx, params),
  { source: 'image-studio.projects.[projectId].assets.GET' }
);

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.projects.[projectId].assets.POST' }
);
