export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
const projectsRootResolved = path.resolve(projectsRoot);

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const resolveProjectDir = (candidate: string): string | null => {
  if (!candidate) return null;
  if (candidate.includes('/') || candidate.includes('\\')) return null;
  const resolved = path.resolve(projectsRootResolved, candidate);
  if (!resolved.startsWith(`${projectsRootResolved}${path.sep}`)) return null;
  return resolved;
};

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const rawProjectId = params.projectId?.trim() ?? '';
  if (!rawProjectId) throw badRequestError('Project id is required');
  const candidates = Array.from(
    new Set([rawProjectId, sanitizeProjectId(rawProjectId)].filter(Boolean))
  );

  let deleted = false;
  for (const candidate of candidates) {
    const projectDir = resolveProjectDir(candidate);
    if (!projectDir) continue;
    const stats = await fs.stat(projectDir).catch(() => null);
    if (!stats?.isDirectory()) continue;
    await fs.rm(projectDir, { recursive: true, force: true });
    deleted = true;
  }

  if (!deleted) {
    throw notFoundError('Project not found', { projectId: rawProjectId });
  }

  return NextResponse.json({ projectId: rawProjectId, deleted: true });
}

export const DELETE = apiHandlerWithParams(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    DELETE_handler(req, ctx, params),
  { source: 'image-studio.projects.DELETE' }
);
