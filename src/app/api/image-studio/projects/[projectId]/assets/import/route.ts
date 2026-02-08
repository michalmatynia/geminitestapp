export const runtime = 'nodejs';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImageFileRepository } from '@/features/files/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import type { ImageFileRecord } from '@/shared/types/files';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
const MAX_REMOTE_IMPORT_BYTES = 15 * 1024 * 1024;
const REMOTE_FETCH_TIMEOUT_MS = 15_000;

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);

  return parts.join('/');
};

function resolveDiskPathFromPublicUploadPath(filepath: string): string | null {
  const clean = filepath.trim();
  if (!clean) return null;
  let normalized = clean.replace(/\\/g, '/');
  if (normalized.startsWith('public/')) {
    normalized = `/${normalized}`;
  }
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch {
      // Keep original if parsing fails.
    }
  }
  const publicIndex = normalized.indexOf('/public/');
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + '/public'.length);
  }
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  } else if (normalized.startsWith('uploads/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith('/uploads/')) return null;
  const resolved = path.resolve(process.cwd(), 'public', normalized.replace(/^\/+/, ''));
  const uploadsResolved = path.resolve(uploadsRoot);
  if (!resolved.startsWith(`${uploadsResolved}${path.sep}`)) return null;
  return resolved;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '');
  return sanitized || 'import.bin';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isDataUrl(value: string): boolean {
  return value.trim().startsWith('data:');
}

function guessExtensionFromMime(mime: string | null | undefined): string | null {
  const clean = (mime ?? '').toLowerCase();
  if (!clean) return null;
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('png')) return '.png';
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('gif')) return '.gif';
  if (clean.includes('svg')) return '.svg';
  return null;
}

function ensureFilenameExtension(name: string, mime: string | null | undefined): string {
  if (path.extname(name)) return name;
  const ext = guessExtensionFromMime(mime);
  return ext ? `${name}${ext}` : name;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string | null } | null {
  const match = dataUrl.trim().match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    return { buffer, mime: match[1] ?? null };
  } catch {
    return null;
  }
}

async function fetchRemoteFile(url: string): Promise<{ buffer: Buffer; mime: string | null; filename: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Remote fetch failed (${response.status})`);
    }
    const mime = response.headers.get('content-type');
    const lengthHeader = response.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_REMOTE_IMPORT_BYTES) {
      throw new Error('Remote file is too large');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMPORT_BYTES) {
      throw new Error('Remote file is too large');
    }
    let filename = 'remote-file';
    try {
      const pathname = new URL(url).pathname;
      filename = path.basename(pathname) || filename;
    } catch {
      // keep fallback
    }
    return { buffer, mime, filename };
  } finally {
    clearTimeout(timeout);
  }
}

const importSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        filepath: z.string().min(1),
        filename: z.string().min(1).optional(),
        mimetype: z.string().min(1).optional(),
      })
    )
    .min(1),
  folder: z.string().optional(),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const safeFolder =
    parsed.data.folder?.trim()
      ? sanitizeFolderPath(parsed.data.folder)
      : '';

  const diskDir = safeFolder
    ? path.join(projectsRoot, projectId, safeFolder)
    : path.join(projectsRoot, projectId);

  const publicDir = safeFolder
    ? `/uploads/studio/${projectId}/${safeFolder}`
    : `/uploads/studio/${projectId}`;

  await fs.mkdir(diskDir, { recursive: true });

  const ids = parsed.data.files.map((item) => item.id).filter(Boolean) as string[];
  let sourceById = new Map<string, ImageFileRecord>();
  let repo: Awaited<ReturnType<typeof getImageFileRepository>> | null = null;
  try {
    repo = await getImageFileRepository();
    if (ids.length > 0) {
      const records = await repo.findImageFilesByIds(ids);
      sourceById = new Map(records.map((record) => [record.id, record]));
    }
  } catch {
    repo = null;
    sourceById = new Map();
  }

  const uploaded: ImageFileRecord[] = [];
  const failures: Array<{ filepath: string; error: string }> = [];

  for (const item of parsed.data.files) {
    const sourceRecord = item.id ? sourceById.get(item.id) ?? null : null;
    const sourcePath = item.id ? sourceRecord?.filepath ?? item.filepath : item.filepath;
    const rawSource = sourcePath ?? '';

    if (isDataUrl(rawSource)) {
      const parsedData = parseDataUrl(rawSource);
      if (!parsedData) {
        failures.push({ filepath: rawSource, error: 'Invalid base64 data URL' });
        continue;
      }
      if (parsedData.buffer.length > MAX_REMOTE_IMPORT_BYTES) {
        failures.push({ filepath: rawSource, error: 'Base64 data is too large' });
        continue;
      }
      const mime = parsedData.mime || item.mimetype || sourceRecord?.mimetype || 'application/octet-stream';
      const baseName = sourceRecord?.filename || item.filename || 'base64-image';
      const safeName = sanitizeFilename(ensureFilenameExtension(baseName, mime));
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
      const destDiskPath = path.join(diskDir, filename);
      await fs.writeFile(destDiskPath, parsedData.buffer);

      const recordInput = {
        filename,
        filepath: `${publicDir}/${filename}`,
        mimetype: mime,
        size: parsedData.buffer.length,
        tags: [],
      };

      if (repo) {
        try {
          uploaded.push(await repo.createImageFile(recordInput));
          continue;
        } catch {
          // fall through to orphan record
        }
      }

      const now = new Date();
      uploaded.push({
        id: randomUUID(),
        filename: recordInput.filename,
        filepath: recordInput.filepath,
        mimetype: recordInput.mimetype,
        size: recordInput.size,
        width: null,
        height: null,
        tags: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      continue;
    }

    if (isHttpUrl(rawSource)) {
      try {
        const remote = await fetchRemoteFile(rawSource);
        const mime = remote.mime || item.mimetype || sourceRecord?.mimetype || 'application/octet-stream';
        const baseName = sourceRecord?.filename || item.filename || remote.filename || 'remote-image';
        const safeName = sanitizeFilename(ensureFilenameExtension(baseName, mime));
        const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
        const destDiskPath = path.join(diskDir, filename);
        await fs.writeFile(destDiskPath, remote.buffer);

        const recordInput = {
          filename,
          filepath: `${publicDir}/${filename}`,
          mimetype: mime,
          size: remote.buffer.length,
          tags: [],
        };

        if (repo) {
          try {
            uploaded.push(await repo.createImageFile(recordInput));
            continue;
          } catch {
            // fall through to orphan record
          }
        }

        const now = new Date();
        uploaded.push({
          id: randomUUID(),
          filename: recordInput.filename,
          filepath: recordInput.filepath,
          mimetype: recordInput.mimetype,
          size: recordInput.size,
          width: null,
          height: null,
          tags: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        continue;
      } catch (error) {
        failures.push({ filepath: rawSource, error: error instanceof Error ? error.message : 'Failed to fetch remote file' });
        continue;
      }
    }

    const diskSource = resolveDiskPathFromPublicUploadPath(rawSource);
    if (!diskSource) {
      failures.push({ filepath: rawSource, error: 'Unsupported file path (must be under /uploads/)' });
      continue;
    }

    const stats = await fs.stat(diskSource).catch(() => null);
    if (!stats?.isFile()) {
      failures.push({ filepath: rawSource, error: 'File not found on disk' });
      continue;
    }

    const sourceName = sourceRecord?.filename || item.filename || path.basename(rawSource);
    const safeName = sanitizeFilename(sourceName);
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

    const destDiskPath = path.join(diskDir, filename);
    await fs.copyFile(diskSource, destDiskPath);

    const recordInput = {
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: sourceRecord?.mimetype || item.mimetype || 'application/octet-stream',
      size: stats.size,
      tags: [],
    };

    if (repo) {
      try {
        uploaded.push(await repo.createImageFile(recordInput));
        continue;
      } catch {
        // fall through to orphan record
      }
    }

    const now = new Date();
    uploaded.push({
      id: randomUUID(),
      filename: recordInput.filename,
      filepath: recordInput.filepath,
      mimetype: recordInput.mimetype,
      size: recordInput.size,
      width: null,
      height: null,
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  if (uploaded.length === 0) {
    throw badRequestError('No files imported', { failures });
  }

  return NextResponse.json({ uploaded, failures }, { status: 201 });
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.projects.[projectId].assets.import.POST' }
);
