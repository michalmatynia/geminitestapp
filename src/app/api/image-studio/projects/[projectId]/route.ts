export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { deleteImageStudioRunsByProject } from '@/features/ai/image-studio/server/run-repository';
import { deleteImageStudioSlotLinksForProject } from '@/features/ai/image-studio/server/slot-link-repository';
import { deleteImageStudioSlotsByProject } from '@/features/ai/image-studio/server/slot-repository';
import { getImageFileRepository } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
const projectsRootResolved = path.resolve(projectsRoot);

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const isSafeProjectIdCandidate = (value: string): boolean =>
  value.length > 0 && !value.includes('/') && !value.includes('\\');

const toProjectIdCandidates = (rawProjectId: string): string[] =>
  Array.from(
    new Set(
      [rawProjectId, sanitizeProjectId(rawProjectId)]
        .map((value) => value.trim())
        .filter((value) => isSafeProjectIdCandidate(value))
    )
  );

const resolveProjectDir = (candidate: string): string | null => {
  if (!candidate) return null;
  if (candidate.includes('/') || candidate.includes('\\')) return null;
  const resolved = path.resolve(projectsRootResolved, candidate);
  if (!resolved.startsWith(`${projectsRootResolved}${path.sep}`)) return null;
  return resolved;
};

const normalizePublicPath = (filepath: string | null | undefined): string | null => {
  const raw = typeof filepath === 'string' ? filepath.trim() : '';
  if (!raw) return null;

  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return raw;
    }
  }

  if (normalized.startsWith('public/')) {
    normalized = `/${normalized}`;
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
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
};

const isProjectAssetPath = (
  filepath: string | null | undefined,
  projectIdCandidates: string[]
): boolean => {
  const normalized = normalizePublicPath(filepath);
  if (!normalized) return false;
  return projectIdCandidates.some((projectId) => {
    const prefix = `/uploads/studio/${projectId}/`;
    return normalized.startsWith(prefix);
  });
};

async function deleteProjectImageFileRecords(projectIdCandidates: string[]): Promise<number> {
  if (projectIdCandidates.length === 0) return 0;
  const repo = await getImageFileRepository();
  const allImageFiles = await repo.listImageFiles();
  const projectFiles = allImageFiles.filter((file) =>
    isProjectAssetPath(file.filepath, projectIdCandidates)
  );
  let deletedCount = 0;
  for (const file of projectFiles) {
    const deleted = await repo.deleteImageFile(file.id);
    if (deleted) deletedCount += 1;
  }
  return deletedCount;
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const rawProjectId = params.projectId?.trim() ?? '';
  if (!rawProjectId) throw badRequestError('Project id is required');
  const candidates = toProjectIdCandidates(rawProjectId);

  const stats = {
    directoriesDeleted: 0,
    slotsDeleted: 0,
    slotLinksDeleted: 0,
    runsDeleted: 0,
    imageFileRecordsDeleted: 0,
  };

  for (const candidate of candidates) {
    stats.slotLinksDeleted += await deleteImageStudioSlotLinksForProject(candidate);
    stats.slotsDeleted += await deleteImageStudioSlotsByProject(candidate);
    stats.runsDeleted += await deleteImageStudioRunsByProject(candidate);
  }

  stats.imageFileRecordsDeleted = await deleteProjectImageFileRecords(candidates);

  for (const candidate of candidates) {
    const projectDir = resolveProjectDir(candidate);
    if (!projectDir) continue;
    const projectDirStats = await fs.stat(projectDir).catch(() => null);
    if (!projectDirStats?.isDirectory()) continue;
    await fs.rm(projectDir, { recursive: true, force: true });
    stats.directoriesDeleted += 1;
  }

  const deleted = Object.values(stats).some((count) => count > 0);
  if (!deleted) {
    throw notFoundError('Project not found', { projectId: rawProjectId });
  }

  return NextResponse.json({ projectId: rawProjectId, deleted: true, stats });
}

export const DELETE = apiHandlerWithParams(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    DELETE_handler(req, ctx, params),
  { source: 'image-studio.projects.DELETE' }
);
